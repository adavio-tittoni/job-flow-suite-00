// Worker: consome um job do RabbitMQ via HTTP Management API (sem cliente AMQP). Baixa Storage, webhook n8n, atualiza DB.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const QUEUE_NAME = "document-processing";
const BUCKET = "candidate-documents";

interface QueueJob {
  candidateId: string;
  documentId: string;
  fileStoragePath: string;
  fileName: string;
  fileType?: string;
}

function getManagementBase(): { baseUrl: string; auth: string } {
  let url = Deno.env.get("RABBITMQ_MANAGEMENT_URL") ?? deriveManagementUrl(Deno.env.get("RABBITMQ_URL"));
  if (!url) throw new Error("RABBITMQ_MANAGEMENT_URL or RABBITMQ_URL required");
  const u = new URL(url);
  if (u.protocol === "https:" && u.port === "15672") {
    u.protocol = "http:";
    url = u.toString();
  }
  const baseUrl = `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}`;
  const auth = btoa(`${decodeURIComponent(u.username || "")}:${decodeURIComponent(u.password || "")}`);
  return { baseUrl, auth };
}

function deriveManagementUrl(amqpUrl: string | undefined): string | undefined {
  if (!amqpUrl || !amqpUrl.startsWith("amqp")) return undefined;
  const protocol = amqpUrl.startsWith("amqps") ? "https" : "http";
  const u = new URL(amqpUrl.replace(/^amqps?/, protocol));
  u.port = "15672";
  return u.toString();
}

function storagePathToUrlPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function rest(
  base: string,
  key: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) return { ok: false, error: typeof data === "object" && data && "message" in data ? String((data as { message: string }).message) : text };
  return { ok: true, data };
}

async function restPatch(base: string, key: string, table: string, id: string, body: Record<string, unknown>): Promise<{ ok: boolean }> {
  const r = await rest(base, key, "PATCH", `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, body);
  return { ok: r.ok };
}

const WORKER_TIMEOUT_MS = 50_000;

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
    }
    const rabbitUrl = Deno.env.get("RABBITMQ_URL");
    const managementUrl = Deno.env.get("RABBITMQ_MANAGEMENT_URL");
    if (!rabbitUrl && !managementUrl) {
      return jsonResponse({ ok: true, processed: 0, error: "RABBITMQ_URL or RABBITMQ_MANAGEMENT_URL required" }, 200);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL") || Deno.env.get("VITE_N8N_WEBHOOK_URL");
    const webhookToken = Deno.env.get("N8N_WEBHOOK_AUTH_TOKEN") || Deno.env.get("VITE_N8N_WEBHOOK_AUTH_TOKEN");

    async function runWorker(): Promise<Response> {
      const { baseUrl, auth } = getManagementBase();
      const getRes = await fetch(`${baseUrl}/api/queues/%2F/${encodeURIComponent(QUEUE_NAME)}/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ count: 1, ackmode: "ack_requeue_false", encoding: "auto" }),
      });
      if (!getRes.ok) {
        const text = await getRes.text();
        throw new Error(`RabbitMQ get ${getRes.status}: ${text}`);
      }
      const messages = (await getRes.json()) as { payload?: string; payload_encoding?: string }[];
      if (!Array.isArray(messages) || messages.length === 0) {
        return jsonResponse({ ok: true, processed: 0 }, 200);
      }
      const raw = messages[0].payload ?? "";
      const job = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as QueueJob;
      if (!job.candidateId || !job.documentId || !job.fileStoragePath) {
        return jsonResponse({ ok: false, error: "Job inválido" }, 400);
      }

      const storagePath = storagePathToUrlPath(job.fileStoragePath);
      const storageUrl = `${supabaseUrl}/storage/v1/object/authenticated/${BUCKET}/${storagePath}`;
      const fileRes = await fetch(storageUrl, {
        headers: { Authorization: `Bearer ${serviceRole}` },
      });

      if (!fileRes.ok || !fileRes.body) {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_type: "Erro",
          detail: `Falha ao baixar do storage: ${fileRes.status}`,
          updated_at: new Date().toISOString(),
        });
        return jsonResponse({ ok: true, processed: 1, error: "download failed" }, 200);
      }

      const buf = await fileRes.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const filesWithBase64 = [
        {
          name: job.fileName,
          type: job.fileType || "application/octet-stream",
          size: buf.byteLength,
          base64,
          lastModified: Date.now(),
          storage_path: job.fileStoragePath,
          document_id: job.documentId,
        },
      ];

      const candidateRes = await fetch(
        `${supabaseUrl}/rest/v1/candidates?id=eq.${encodeURIComponent(job.candidateId)}&select=id,matrix_id,name`,
        {
          headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
        }
      );
      const candidates = (await candidateRes.json()) as { id: string; matrix_id: string | null; name: string }[];
      const candidate = candidates?.[0];
      if (!candidate) {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_type: "Erro",
          detail: "Candidato não encontrado",
          updated_at: new Date().toISOString(),
        });
        return jsonResponse({ ok: true, processed: 1, error: "candidate not found" }, 200);
      }

      let matrixDocuments: unknown[] = [];
      if (candidate.matrix_id) {
        const matrixRes = await fetch(
          `${supabaseUrl}/rest/v1/matrix_items?matrix_id=eq.${encodeURIComponent(candidate.matrix_id)}&select=id,document_id,obrigatoriedade,modalidade,carga_horaria,regra_validade,documents_catalog(id,name,codigo,sigla_documento,document_category,document_type,group_name,categoria,sigla_ingles,nome_ingles,equivalente)`,
          { headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } }
        );
        const matrixItems = (await matrixRes.json()) as {
          id: string;
          document_id: string;
          obrigatoriedade?: string;
          modalidade?: string;
          carga_horaria?: number;
          regra_validade?: string;
          documents_catalog: unknown;
        }[];
        matrixDocuments = (matrixItems || []).map((item) => ({
          matrix_item_id: item.id,
          document_id: item.document_id,
          obrigatoriedade: item.obrigatoriedade,
          modalidade: item.modalidade,
          carga_horaria: item.carga_horaria,
          regra_validade: item.regra_validade,
          document: item.documents_catalog,
        }));
      }

      const webhookData = {
        candidate_id: job.candidateId,
        candidate_name: candidate.name,
        matrix_id: candidate.matrix_id,
        document_id: job.documentId,
        file_storage_path: job.fileStoragePath,
        files: filesWithBase64,
        matrix_documents: matrixDocuments,
        processed_results: [],
        timestamp: new Date().toISOString(),
        total_files: 1,
        total_matrix_documents: matrixDocuments.length,
        webhook_source: "job-flow-suite",
        status: "processing_comparison",
      };

      if (!webhookUrl || webhookUrl.trim() === "") {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_type: "Erro",
          detail: "Webhook n8n não configurado. Defina N8N_WEBHOOK_URL nos secrets da Edge Function.",
          updated_at: new Date().toISOString(),
        });
        return jsonResponse({ ok: true, processed: 1, error: "N8N_WEBHOOK_URL not set" }, 200);
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (webhookToken) headers["Authorization"] = `Bearer ${webhookToken}`;

      console.log("[process-document-queue] chamando webhook n8n, documentId:", job.documentId);
      const res = await fetch(webhookUrl, { method: "POST", headers, body: JSON.stringify(webhookData) });
      console.log("[process-document-queue] webhook respondeu:", res.status);
      const responseText = await res.text();
      let responseData: { message?: string } = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }
      const msg = responseData?.message || responseText || "";
      const isNotBelonging = /documento n[ãa]o pertence|n[ãa]o pertence ao candidato/i.test(msg);

      if (isNotBelonging) {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_name: "Documento não pertence ao candidato",
          document_type: "Rejeitado",
          detail: `Documento rejeitado: ${job.fileName}. ${msg}`,
          updated_at: new Date().toISOString(),
        });
      } else if (res.ok) {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_type: "Processado",
          detail: msg || "Documento processado com sucesso.",
          updated_at: new Date().toISOString(),
        });
      } else {
        await restPatch(supabaseUrl, serviceRole, "candidate_documents", job.documentId, {
          document_type: "Erro",
          detail: msg || `Webhook retornou ${res.status}`,
          updated_at: new Date().toISOString(),
        });
      }

      return jsonResponse({ ok: true, processed: 1 }, 200);
    }

    const res = await Promise.race([
      runWorker(),
      new Promise<Response>((resolve) =>
        setTimeout(
          () => resolve(jsonResponse({ ok: true, processed: 0, error: "worker timeout (50s)" }, 200)),
          WORKER_TIMEOUT_MS
        )
      ),
    ]);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("process-document-queue error:", err);
    return jsonResponse({ ok: true, processed: 0, error: msg }, 200);
  }
});

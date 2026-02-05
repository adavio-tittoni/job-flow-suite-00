// Enfileira job no RabbitMQ via HTTP Management API (sem cliente AMQP = sem 503 por cold start).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const QUEUE_NAME = "document-processing";

interface EnqueueBody {
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const rabbitUrl = Deno.env.get("RABBITMQ_URL");
  const managementUrl = Deno.env.get("RABBITMQ_MANAGEMENT_URL");
  if (!rabbitUrl && !managementUrl) {
    return new Response(JSON.stringify({ error: "RABBITMQ_URL or RABBITMQ_MANAGEMENT_URL required" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let body: EnqueueBody;
  try {
    body = (await req.json()) as EnqueueBody;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const { candidateId, documentId, fileStoragePath, fileName, fileType } = body;
  if (!candidateId || !documentId || !fileStoragePath || !fileName) {
    return new Response(
      JSON.stringify({ error: "Faltam campos: candidateId, documentId, fileStoragePath, fileName" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const job = { candidateId, documentId, fileStoragePath, fileName, fileType: fileType || "" };

  try {
    const { baseUrl, auth } = getManagementBase();
    const res = await fetch(`${baseUrl}/api/exchanges/%2F/amq.default/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        properties: {},
        routing_key: QUEUE_NAME,
        payload: JSON.stringify(job),
        payload_encoding: "string",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RabbitMQ HTTP ${res.status}: ${text}`);
    }

    // Disparo imediato: assim que cai na fila, invoca o worker (não espera o cron).
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const workerUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/process-document-queue` : "";
    const authHeader = req.headers.get("Authorization") || (Deno.env.get("SUPABASE_ANON_KEY") ? `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` : null);
    if (workerUrl && authHeader) {
      fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: "{}",
      }).catch((e) => console.warn("[enqueue-document] trigger worker:", e));
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Enqueue error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro ao enfileirar" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

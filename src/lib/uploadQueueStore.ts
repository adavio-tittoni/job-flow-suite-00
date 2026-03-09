/**
 * Store em memória para manter referência aos File da fila de upload.
 * Sobrevive à desmontagem do componente; liberado em clearCompleted.
 */
const fileStore = new Map<string, File>();

export function setFile(id: string, file: File): void {
  fileStore.set(id, file);
}

export function getFile(id: string): File | undefined {
  return fileStore.get(id);
}

export function removeFile(id: string): void {
  fileStore.delete(id);
}

export function clearFiles(ids: string[]): void {
  ids.forEach((id) => fileStore.delete(id));
}

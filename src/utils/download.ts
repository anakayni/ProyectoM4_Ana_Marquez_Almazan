/** Descarga un texto como archivo (sin servidor: se arma en el navegador). */
export function downloadTextFile(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Se libera después, para no cortar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

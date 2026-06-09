function fileSafeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function downloadPdfFromMarkdownElement(
  sourceElement: HTMLElement,
  title: string,
): Promise<void> {
  if (!sourceElement.innerHTML.trim()) {
    throw new Error("The final brief preview is empty.");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const exportElement = document.createElement("article");

  exportElement.className = "markdown-preview pdf-export-document";
  exportElement.innerHTML = sourceElement.innerHTML;
  document.body.appendChild(exportElement);

  try {
    const canvas = await html2canvas(exportElement, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      windowWidth: exportElement.scrollWidth,
      windowHeight: exportElement.scrollHeight,
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let remainingHeight = imageHeight;
    let yPosition = 0;

    pdf.addImage(imageData, "PNG", 0, yPosition, pageWidth, imageHeight);
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      yPosition = remainingHeight - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, yPosition, pageWidth, imageHeight);
      remainingHeight -= pageHeight;
    }

    pdf.save(`${fileSafeName(title) || "opportunity-brief"}.pdf`);
  } finally {
    exportElement.remove();
  }
}

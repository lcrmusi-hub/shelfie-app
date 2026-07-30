// lib/shareCard.js
// -------------------------------------------------------------
// Renders a hidden DOM card, snapshots it with html2canvas, and
// gives the user a downloadable PNG + native share sheet.
// Setup: npm install html2canvas
// -------------------------------------------------------------
import html2canvas from "html2canvas";

/**
 * Renders `element` (a ref to an off-screen or on-screen DOM node built
 * with your Cozy Library styling) to a PNG and triggers download/share.
 *
 * Usage in a component:
 *   const cardRef = useRef(null);
 *   <div ref={cardRef} className="hidden">...card markup...</div>
 *   <button onClick={() => exportCard(cardRef.current, "shelfie-year-in-books.png")}>
 *     Share Stats
 *   </button>
 */
export async function exportCard(element, filename = "shelfie-card.png") {
  if (!element) throw new Error("No card element to export.");

  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 3, // sharp on retina screens
    useCORS: true, // needed so book cover images from external URLs render correctly
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

  // Prefer the native share sheet on mobile (lets them share directly to
  // Instagram/Messages/etc.); fall back to a plain download.
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
    const file = new File([blob], filename, { type: "image/png" });
    await navigator.share({ files: [file], title: "My Shelfie stats" });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/* -------------------------------------------------------------
   Example card markup (Currently Reading card).
   Build this as a real component styled with the Cozy Library
   tokens; keep it off-screen (position:absolute; left:-9999px)
   until the moment you export it, so it never affects layout.
------------------------------------------------------------- */
export const CARD_EXAMPLE_JSX = `
function CurrentlyReadingCard({ book, progress, streak }) {
  return (
    <div style={{
      width: 400, height: 500, borderRadius: 24, padding: 32,
      background: "linear-gradient(160deg, #F5F0E8, #E8DCC8)",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", gap: 16 }}>
        <img src={book.cover_url} style={{ width: 100, height: 150, borderRadius: 8, boxShadow: "0 8px 20px rgba(139,94,60,0.3)" }} />
        <div>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: "#3D2914" }}>{book.title}</h2>
          <p style={{ color: "#6B5B4F" }}>{book.author}</p>
        </div>
      </div>
      <div>
        <div style={{ width: "100%", height: 10, borderRadius: 999, background: "#EDE3D3" }}>
          <div style={{ width: progress + "%", height: "100%", borderRadius: 999, background: "#C75B39" }} />
        </div>
        <p style={{ color: "#C75B39", fontFamily: "Space Grotesk, monospace", marginTop: 8 }}>{progress}% done</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>🔥 {streak}-day streak</span>
        <span style={{ fontSize: 11, color: "#9A8A75" }}>Made with Shelfie</span>
      </div>
    </div>
  );
}
`;

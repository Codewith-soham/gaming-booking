// Illustrative only: a decorative pattern derived from the reference. It is NOT a scannable or
// secure credential (DOMAIN-MODEL section 8).
export default function QrPlaceholder({ reference }) {
  const cells = 9
  const bits = Array.from({ length: cells * cells }, (_, i) => {
    const code = reference.charCodeAt(i % reference.length) + i * 7
    return code % 3 !== 0
  })
  return (
    <figure className="inline-flex flex-col items-center gap-2">
      <svg
        role="img"
        aria-label={`Demo QR placeholder for ${reference}`}
        viewBox={`0 0 ${cells} ${cells}`}
        className="size-32 rounded-lg bg-white p-2"
      >
        {bits.map(
          (on, i) =>
            on && (
              <rect
                key={i}
                x={i % cells}
                y={Math.floor(i / cells)}
                width="1"
                height="1"
                fill="#0b0d12"
              />
            ),
        )}
      </svg>
      <figcaption className="max-w-40 text-center text-xs text-muted">
        Demo QR placeholder. Not a real check-in code.
      </figcaption>
    </figure>
  )
}

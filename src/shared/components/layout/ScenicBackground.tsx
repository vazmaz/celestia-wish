/** Shared Teyvat scenic backdrop used across authenticated pages. */
export function ScenicBackground() {
  return (
    <div className="scenic-bg" aria-hidden>
      <img
        className="scenic-bg__image"
        src="/hero/celestia-valley.jpg"
        alt=""
        fetchPriority="high"
      />
      <div className="scenic-bg__glow" />
      <div className="scenic-bg__fade" />
    </div>
  )
}

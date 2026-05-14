function Topbar({
  isPreviewMode,
  setIsPreviewMode,
  handleCopySummary,
  handleShareMove,
  handleDuplicateMove,
  moveId,
  copied,
  shareCopied,
  isSharing,
  shareError,
}) {
  return (
    <header className="topbar">
      <div className="logo">what's the move</div>

      <div className="topbar-actions">
        <button
          className="secondary-btn"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          {isPreviewMode ? "Back to Edit" : "Preview"}
        </button>

        {!isPreviewMode && (
          <button
            className="secondary-btn"
            onClick={() => {
              localStorage.removeItem("whatsTheMoveDraft");
              window.location.reload();
            }}
          >
            Clear Draft
          </button>
        )}

        <button
          className={`secondary-btn copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopySummary}
        >
          {copied ? "Copied!" : "Copy Summary"}
        </button>

        {moveId && (
          <button className="secondary-btn" onClick={handleDuplicateMove}>
            Duplicate Move
          </button>
        )}

        <button className="primary-btn" onClick={handleShareMove} disabled={isSharing}>
          {isSharing ? "Sharing..." : shareCopied ? "Link copied!" : "Share"}
        </button>

        {shareError && <span className="share-error">{shareError}</span>}

      </div>
    </header>
  );
}

export default Topbar;
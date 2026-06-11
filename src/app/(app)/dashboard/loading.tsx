export default function DashboardLoading() {
  return (
    <div className="container-xl">
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title placeholder-glow">
              <span className="placeholder col-3" />
            </h2>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="col-6 col-lg-3">
            <div className="card card-sm">
              <div className="card-body placeholder-glow">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="placeholder col-5" style={{ height: 12 }} />
                  <div className="placeholder col-2 rounded-circle" style={{ height: 28, width: 28 }} />
                </div>
                <div className="placeholder col-4" style={{ height: 32 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline + Recent leads */}
      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header placeholder-glow">
              <div className="placeholder col-4" style={{ height: 16 }} />
            </div>
            <div className="card-body placeholder-glow">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <div className="placeholder col-4" style={{ height: 12 }} />
                    <div className="placeholder col-2" style={{ height: 12 }} />
                  </div>
                  <div className="placeholder col-12 progress progress-sm" style={{ height: 6 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header placeholder-glow">
              <div className="placeholder col-4" style={{ height: 16 }} />
            </div>
            <div className="card-body p-0 placeholder-glow">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="d-flex align-items-center gap-3 p-3 border-bottom">
                  <div className="placeholder rounded" style={{ height: 32, width: 32 }} />
                  <div className="flex-fill">
                    <div className="placeholder col-6 mb-1" style={{ height: 12 }} />
                    <div className="placeholder col-4" style={{ height: 10 }} />
                  </div>
                  <div className="placeholder col-1" style={{ height: 20 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

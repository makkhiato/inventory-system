/* Procurement Dashboard — Pending / Approved filter for the Material
   Requests card. Prototype only: both lists are hardcoded in the page. */
(function () {
  var pendingBtn = document.getElementById('pd-mr-pending-btn');
  var approvedBtn = document.getElementById('pd-mr-approved-btn');
  var pendingRows = document.getElementById('pd-mr-pending');
  var approvedRows = document.getElementById('pd-mr-approved');
  if (!pendingBtn || !approvedBtn || !pendingRows || !approvedRows) return;

  function show(showPending) {
    pendingRows.hidden = !showPending;
    approvedRows.hidden = showPending;

    pendingBtn.setAttribute('aria-pressed', String(showPending));
    approvedBtn.setAttribute('aria-pressed', String(!showPending));

    pendingBtn.classList.toggle('cai-btn--primary', showPending);
    pendingBtn.classList.toggle('cai-btn--outline', !showPending);
    approvedBtn.classList.toggle('cai-btn--primary', !showPending);
    approvedBtn.classList.toggle('cai-btn--outline', showPending);
  }

  pendingBtn.addEventListener('click', function () { show(true); });
  approvedBtn.addEventListener('click', function () { show(false); });
})();

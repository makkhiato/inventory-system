/* Prototype only: there is no real authentication yet. The username and
   password must match a role's demo credentials (both fields identical),
   and the person is sent to that role's dashboard. Anything else shows an
   error. Replace with a real backend check before going live: anyone can
   read these credentials in the browser. */
var CAI_ROLES = {
  owner:            'owner_dashboard.html',
  foreman:          'foreman_dashboard.html',
  procurementstaff: 'procurement_dashboard.html',
  storagemanager:   'storage_dashboard.html'
};

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();

  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value;
  var error = document.getElementById('login-error');

  if (Object.prototype.hasOwnProperty.call(CAI_ROLES, username) && password === username) {
    window.location.href = CAI_ROLES[username];
    return;
  }

  error.textContent = 'Incorrect username or password.';
  error.hidden = false;
});

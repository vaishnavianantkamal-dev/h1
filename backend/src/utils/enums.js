// Port of app/Enums/UserRole.php (string-backed enum)
const UserRole = Object.freeze({
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  OPERATION_HEAD: 'operation_head',
  CUSTOMER: 'customer',
  WORKER: 'worker',
});

module.exports = { UserRole };

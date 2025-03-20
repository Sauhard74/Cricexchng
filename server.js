import { approveRequest, rejectRequest } from './api/creditRequests.js';

// Make sure this is at the top of your Express setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make sure these routes are directly registered with the app, not a subrouter
app.post('/api/admin/credit-requests/approve', isAdmin, approveRequest);
app.post('/api/admin/credit-requests/reject', isAdmin, rejectRequest); 
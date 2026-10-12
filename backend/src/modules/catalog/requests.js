// Ports of the (currently unused by any controller) FormRequests:
//   App\Http\Requests\StoreServiceCategoryRequest, StoreServiceRequest, UpdateServiceRequest
// Usage: const data = await validateEx(req, storeServiceCategoryRules);
const storeServiceCategoryRules = {
  name: 'required|unique:service_categories,name',
  icon: 'nullable|string',
  description: 'nullable|string',
  status: 'boolean',
};

const storeServiceRules = {
  category_id: 'required|exists:service_categories,id',
  name: 'required',
  base_price: 'required|numeric|min:0',
  discount_price: 'nullable|numeric|min:0',
  duration_minutes: 'nullable|integer|min:1',
  commission_type: 'required|in:flat,percentage',
  commission_value: 'required|numeric|min:0',
  status: 'boolean',
};

const updateServiceRules = {
  category_id: 'sometimes|exists:service_categories,id',
  name: 'sometimes|string',
  base_price: 'sometimes|numeric|min:0',
  discount_price: 'sometimes|numeric|min:0',
  duration_minutes: 'sometimes|integer|min:1',
  commission_type: 'sometimes|in:flat,percentage',
  commission_value: 'sometimes|numeric|min:0',
  status: 'sometimes|boolean',
};

// UpdateServiceRequest::prepareForValidation - lower-case commission_type before validating
function updateServicePrepareForValidation(req) {
  if (req.body && req.body.commission_type) req.body.commission_type = String(req.body.commission_type).toLowerCase();
}

module.exports = { storeServiceCategoryRules, storeServiceRules, updateServiceRules, updateServicePrepareForValidation };

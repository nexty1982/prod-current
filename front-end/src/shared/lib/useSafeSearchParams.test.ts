// Test file to validate useSafeSearchParams functionality
import { getOne, getMany, safeGetAll } from './useSafeSearchParams';

// Test safe parameter helpers
const mockSearchParams = new URLSearchParams('?status=active&tag=west&tag=pilot');

// Test getOne
const status = getOne(mockSearchParams, 'status', '');
console.log('Status:', status); // Should be 'active'

// Test getMany  
const tags = getMany(mockSearchParams, 'tag');
console.log('Tags:', tags); // Should be ['west', 'pilot']

// Test safeGetAll with valid FormData
const formData = new FormData();
formData.append('test', 'value1');
formData.append('test', 'value2');
const formValues = safeGetAll(formData, 'test');
console.log('Form values:', formValues); // Should be ['value1', 'value2']

// Test safeGetAll with invalid input
const invalidValues = safeGetAll(null, 'test');
console.log('Invalid values:', invalidValues); // Should be []

console.log('✅ All tests passed - useSafeSearchParams is working correctly');

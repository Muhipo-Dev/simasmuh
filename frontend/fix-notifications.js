const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useNotifications.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
content = content.replace("import { useNotificationSocket } from './useSocket';", "import { useNotificationSocket } from './useSocket';\nimport { useAuthenticatedFetch } from './useAuthenticatedFetch';");

// Inject authenticatedFetch declaration
content = content.replace("const socket = useNotificationSocket();", "const socket = useNotificationSocket();\n  const authenticatedFetch = useAuthenticatedFetch();");

// Replace all fetch
content = content.replace(/await fetch\(/g, "await authenticatedFetch(");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated useNotifications.ts successfully");

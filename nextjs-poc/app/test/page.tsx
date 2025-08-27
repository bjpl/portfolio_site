export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ✅ Server is Working!
        </h1>
        <p className="text-gray-700 mb-4">
          This test route confirms that the Next.js server is running correctly.
        </p>
        <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
          <h2 className="font-semibold text-blue-800">Server Status:</h2>
          <ul className="text-blue-700 mt-2 space-y-1">
            <li>• Next.js server: Running</li>
            <li>• App Router: Active</li>
            <li>• TypeScript: Enabled</li>
            <li>• Tailwind CSS: Loaded</li>
          </ul>
        </div>
        <div className="mt-4">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
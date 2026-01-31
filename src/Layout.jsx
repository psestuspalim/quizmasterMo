export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <style>{`
        :root {
          color-scheme: dark;
        }
        
        body {
          background: #030712;
          color: #f3f4f6;
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: #374151 #1f2937;
        }
        
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        *::-webkit-scrollbar-track {
          background: #1f2937;
        }
        
        *::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
      {children}
    </div>
  );
}
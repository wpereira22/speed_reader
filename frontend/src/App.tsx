import { useState } from 'react';
import FileUpload from './components/FileUpload';
import Reader from './components/Reader';
import type { UploadResponse } from './types';

function App() {
  const [doc, setDoc] = useState<UploadResponse | null>(null);

  const handleLoaded = (data: UploadResponse) => {
    setDoc(data);
  };

  const handleBack = () => {
    setDoc(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000000' }}>
      {!doc || doc.words.length === 0 ? (
        <FileUpload onLoaded={handleLoaded} />
      ) : (
        <Reader
          words={doc.words}
          fullText={doc.fullText}
          meta={doc.meta}
          fileName={doc.fileName}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;

import React from 'react';

const RecordPreviewPane = ({ record }: any) => {
  return (
    <div>
      <h3>Record Preview</h3>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </div>
  );
};

export default RecordPreviewPane;

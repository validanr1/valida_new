import React from 'react';
import reportTemplate2Html from '@/components/reports/ReportTemplate2';

const ReportTemplate2Viewer = () => {
  return (
    <div dangerouslySetInnerHTML={{ __html: reportTemplate2Html }} />
  );
};

export default ReportTemplate2Viewer;
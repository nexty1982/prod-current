import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { RecordManager } from '@/helpers/records';
import { RECORD_TYPES } from '@/helpers/records/constants';
import ReadOnlyView from './view';

// PDF styles for export
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#bfbfbf',
    flex: 1,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: 'grey',
  },
});

// PDF Document component
const BaptismRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Baptism Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Name</Text>
          <Text style={pdfStyles.tableCell}>Birth Date</Text>
          <Text style={pdfStyles.tableCell}>Reception Date</Text>
          <Text style={pdfStyles.tableCell}>Birthplace</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.first_name} ${record.last_name}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.birth_date ? new Date(record.birth_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{new Date(record.reception_date).toLocaleDateString()}</Text>
            <Text style={pdfStyles.tableCell}>{record.birthplace || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);

/**
 * Baptism Records Page Component
 * Uses the shared RecordManager component with baptism-specific configuration
 */
const BaptismRecords = () => {
  return (
    <RecordManager
      recordType={RECORD_TYPES.BAPTISM}
      PDFDocument={BaptismRecordsPDF}
      ReadOnlyView={ReadOnlyView}
    />
  );
};

export default BaptismRecords;
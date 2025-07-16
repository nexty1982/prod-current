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
const MarriageRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Marriage Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Groom</Text>
          <Text style={pdfStyles.tableCell}>Bride</Text>
          <Text style={pdfStyles.tableCell}>Marriage Date</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
          <Text style={pdfStyles.tableCell}>Witness</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.fname_groom || ''} ${record.lname_groom || ''}`}</Text>
            <Text style={pdfStyles.tableCell}>{`${record.fname_bride || ''} ${record.lname_bride || ''}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.mdate ? new Date(record.mdate).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy || ''}</Text>
            <Text style={pdfStyles.tableCell}>{record.witness || ''}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);

/**
 * Marriage Records Page Component
 * Uses the shared RecordManager component with marriage-specific configuration
 */
const MarriageRecords = () => {
  return (
    <RecordManager
      recordType={RECORD_TYPES.MARRIAGE}
      PDFDocument={MarriageRecordsPDF}
      ReadOnlyView={ReadOnlyView}
    />
  );
};

export default MarriageRecords;
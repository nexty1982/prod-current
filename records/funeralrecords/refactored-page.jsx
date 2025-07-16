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
const FuneralRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Funeral Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Name</Text>
          <Text style={pdfStyles.tableCell}>Date of Death</Text>
          <Text style={pdfStyles.tableCell}>Burial Date</Text>
          <Text style={pdfStyles.tableCell}>Age</Text>
          <Text style={pdfStyles.tableCell}>Burial Location</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.name} ${record.lastname}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.deceased_date ? new Date(record.deceased_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.burial_date ? new Date(record.burial_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.age || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.burial_location || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);

/**
 * Funeral Records Page Component
 * Uses the shared RecordManager component with funeral-specific configuration
 */
const FuneralRecords = () => {
  return (
    <RecordManager
      recordType={RECORD_TYPES.FUNERAL}
      PDFDocument={FuneralRecordsPDF}
      ReadOnlyView={ReadOnlyView}
    />
  );
};

export default FuneralRecords;
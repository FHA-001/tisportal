import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReceiptData {
  receiptNumber: string;
  issueDate: string;
  studentName: string;
  admissionNumber: string;
  parentName: string;
  academicSession: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  bankName?: string;
  paymentDate: string;
  accountantName?: string;
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF();
  
  // School Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TIS MANAGEMENT SYSTEM', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Payment Receipt', 105, 30, { align: 'center' });
  
  // Receipt Number and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt Number: ${data.receiptNumber}`, 20, 45);
  doc.text(`Issue Date: ${new Date(data.issueDate).toLocaleDateString()}`, 140, 45);
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 50, 190, 50);
  
  // Receipt Details Table
  const tableData = [
    ['Student Name', data.studentName],
    ['Admission Number', data.admissionNumber],
    ['Parent Name', data.parentName],
    ['Academic Session', data.academicSession],
    ['Amount Paid', `₦${data.amount.toLocaleString()}`],
    ['Payment Method', data.paymentMethod.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())],
    ['Payment Date', new Date(data.paymentDate).toLocaleDateString()],
  ];
  
  if (data.paymentReference) {
    tableData.push(['Payment Reference', data.paymentReference]);
  }
  
  if (data.bankName) {
    tableData.push(['Bank Name', data.bankName]);
  }
  
  if (data.accountantName) {
    tableData.push(['Processed By', data.accountantName]);
  }
  
  autoTable(doc, {
    startY: 60,
    head: [['Field', 'Value']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('This is an official receipt from TIS Management System.', 105, finalY, { align: 'center' });
  doc.text('Thank you for your payment.', 105, finalY + 8, { align: 'center' });
  
  return doc;
}

export function downloadReceiptPDF(data: ReceiptData, filename?: string) {
  const doc = generateReceiptPDF(data);
  const defaultFilename = `Receipt-${data.receiptNumber}.pdf`;
  doc.save(filename || defaultFilename);
}

export function viewReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

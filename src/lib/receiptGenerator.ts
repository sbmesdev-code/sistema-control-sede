import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale } from '../types/sales';

export const generateReceipt = (sale: Sale) => {
    try {
        const doc = new jsPDF();

        // -- Header --
        doc.setFontSize(18);
        doc.text('SISTEMA DE CONTROL DE SEDE', 105, 15, { align: 'center' });

        doc.setFontSize(10);
        // doc.text('RUC: 20123456789', 105, 20, { align: 'center' });
        // doc.text('Dirección de la Tienda Principal', 105, 24, { align: 'center' });

        // -- Sale Info --
        doc.setFontSize(11);
        doc.text(`Boleta de Venta: ${sale.id.slice(0, 8).toUpperCase()}`, 14, 40);
        const date = new Date(sale.createdAt);
        doc.text(`Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, 14, 45);

        // -- Customer Info --
        doc.text('Cliente:', 14, 55);
        doc.setFontSize(10);
        doc.text(`${sale.customer.name}`, 35, 55);
        doc.text(`${sale.customer.address}`, 35, 60);
        if (sale.customer.district) {
            doc.text(`${sale.customer.district}, ${sale.customer.department || ''}`, 35, 65);
        }

        // -- Items Table --
        const tableBody = sale.items.map(item => [
            `${item.productName} \n${item.color} / ${item.size}`,
            item.quantity,
            `S/ ${item.unitPrice.toFixed(2)}`,
            `S/ ${(item.unitPrice * item.quantity).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['Descripción', 'Cant.', 'P. Unit', 'Importe']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            didDrawPage: () => {
                // Footer or header on each page if needed
            }
        });

        // -- Totals --
        // Use lastAutoTable.finalY safest way
        // @ts-ignore
        const finalY = (doc as any).lastAutoTable?.finalY || 150;

        const startYTotals = finalY + 10;

        doc.setFontSize(10);
        doc.text('Subtotal:', 140, startYTotals, { align: 'right' });
        doc.text(`S/ ${sale.subtotal.toFixed(2)}`, 190, startYTotals, { align: 'right' });

        // Discounts
        let discountY = startYTotals;
        // Check if there is a discount difference
        // Note: sale.total might already include this, but let's check for display

        if (sale.globalDiscount > 0 || sale.items.some(i => i.discount > 0)) {
            discountY += 5;
            // Calculate total discount applied
            const totalDiscount = (sale.subtotal + sale.shippingCost) - sale.total;
            doc.text('Descuentos:', 140, discountY, { align: 'right' });
            doc.text(`- S/ ${totalDiscount.toFixed(2)}`, 190, discountY, { align: 'right' });
        }

        // Shipping
        const shippingY = discountY + 5;
        doc.text('Envío:', 140, shippingY, { align: 'right' });
        doc.text(`S/ ${sale.shippingCost.toFixed(2)}`, 190, shippingY, { align: 'right' });

        // Total
        const totalY = shippingY + 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('TOTAL A PAGAR:', 140, totalY, { align: 'right' });
        doc.text(`S/ ${sale.total.toFixed(2)}`, 190, totalY, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text('¡Gracias por su compra!', 105, totalY + 20, { align: 'center' });

        doc.save(`boleta_${sale.id.slice(0, 8)}.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        throw error;
    }
};

/**
 * Script to Export All Names from Database to Excel
 * تصدير جميع الأسماء من قاعدة البيانات إلى ملف Excel
 */

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Person model
const Person = require('../models/Person');

async function exportNamesToExcel() {
    try {
        console.log('🔄 جاري الاتصال بقاعدة البيانات...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

        // Fetch all persons
        console.log('🔄 جاري سحب جميع الأسماء...');
        const persons = await Person.find({})
            .sort({ generation: 1, fullName: 1 })
            .lean();

        console.log(`✅ تم سحب ${persons.length} شخص من قاعدة البيانات`);

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Alshaer Family Website';
        workbook.created = new Date();

        // Create worksheet
        const worksheet = workbook.addWorksheet('أسماء العائلة', {
            views: [{ rightToLeft: true }] // RTL support for Arabic
        });

        // Define columns
        worksheet.columns = [
            { header: '#', key: 'index', width: 8 },
            { header: 'الاسم الكامل', key: 'fullName', width: 35 },
            { header: 'اللقب', key: 'nickname', width: 20 },
            { header: 'الجيل', key: 'generation', width: 10 },
            { header: 'الجنس', key: 'gender', width: 10 },
            { header: 'تاريخ الميلاد', key: 'birthDate', width: 15 },
            { header: 'مكان الميلاد', key: 'birthPlace', width: 20 },
            { header: 'مكان الإقامة الحالي', key: 'currentResidence', width: 20 },
            { header: 'المهنة', key: 'occupation', width: 20 },
            { header: 'ملاحظات', key: 'notes', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E7D32' } // Green color
        };
        worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 25;

        // Add data rows
        persons.forEach((person, index) => {
            const row = worksheet.addRow({
                index: index + 1,
                fullName: person.fullName || '',
                nickname: person.nickname || '',
                generation: person.generation !== undefined ? person.generation : '',
                gender: person.gender === 'male' ? 'ذكر' : person.gender === 'female' ? 'أنثى' : '',
                birthDate: person.birthDate || '',
                birthPlace: person.birthPlace || '',
                currentResidence: person.currentResidence || '',
                occupation: person.occupation || '',
                notes: person.notes || ''
            });

            // Alternate row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                };
            }

            // Right-align Arabic text
            row.alignment = { horizontal: 'right', vertical: 'middle' };
        });

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                };
            });
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: 'J1'
        };

        // Save the file
        const outputPath = path.join(__dirname, '..', '..', 'alshaer_family_names.xlsx');
        await workbook.xlsx.writeFile(outputPath);

        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ تم تصدير الأسماء بنجاح!');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📁 مسار الملف: ${outputPath}`);
        console.log(`📊 عدد الأسماء: ${persons.length}`);
        console.log('═══════════════════════════════════════════════════');

        // Close connection
        await mongoose.connection.close();
        console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the script
exportNamesToExcel();

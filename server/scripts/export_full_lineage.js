/**
 * Script to Export Full Lineage Names to Excel
 * تصدير الأسماء الكاملة مع سلسلة النسب إلى محمد الشاعر
 * 
 * مثال الناتج: أسامة محمد موسى سلامه محمد أحمد إبراهيم صالح محمد الشاعر
 */

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Person model
const Person = require('../models/Person');

/**
 * Build a map of all persons for quick lookup
 */
function buildPersonMap(persons) {
    const map = new Map();
    persons.forEach(person => {
        map.set(person._id.toString(), person);
    });
    return map;
}

/**
 * Get the full lineage chain from a person back to the root (محمد الشاعر)
 */
function getFullLineage(person, personMap) {
    const lineage = [person.fullName];
    let currentPerson = person;

    while (currentPerson && currentPerson.fatherId) {
        const father = personMap.get(currentPerson.fatherId.toString());
        if (father) {
            lineage.push(father.fullName);
            currentPerson = father;
        } else {
            break;
        }
    }

    return lineage;
}

/**
 * Format lineage as a single string
 * Example: أسامة محمد موسى سلامه محمد أحمد إبراهيم صالح محمد الشاعر
 */
function formatLineageString(lineage) {
    return lineage.join(' ');
}

async function exportFullLineageToExcel() {
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

        // Build lookup map
        const personMap = buildPersonMap(persons);

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Alshaer Family Website';
        workbook.created = new Date();

        // Create worksheet
        const worksheet = workbook.addWorksheet('سلسلة النسب الكاملة', {
            views: [{ rightToLeft: true }] // RTL support for Arabic
        });

        // Define columns
        worksheet.columns = [
            { header: '#', key: 'index', width: 8 },
            { header: 'الاسم', key: 'fullName', width: 25 },
            { header: 'الجيل', key: 'generation', width: 10 },
            { header: 'سلسلة النسب الكاملة', key: 'fullLineage', width: 100 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E7D32' } // Green color
        };
        worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Process each person and add to worksheet
        let index = 0;
        persons.forEach((person) => {
            // Skip the root (محمد الشاعر) since we want descendants
            // Only include persons that have a father (they are descendants)
            if (!person.fatherId && person.isRoot) {
                // Skip the root ancestor
                return;
            }

            index++;
            const lineage = getFullLineage(person, personMap);
            const fullLineageString = formatLineageString(lineage);

            const row = worksheet.addRow({
                index: index,
                fullName: person.fullName || '',
                generation: person.generation !== undefined ? person.generation : '',
                fullLineage: fullLineageString
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
            row.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
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
            to: 'D1'
        };

        // Save the file
        const outputPath = path.join(__dirname, '..', '..', 'alshaer_full_lineage.xlsx');
        await workbook.xlsx.writeFile(outputPath);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('✅ تم تصدير سلسلة النسب الكاملة بنجاح!');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`📁 مسار الملف: ${outputPath}`);
        console.log(`📊 عدد الأشخاص: ${index}`);
        console.log('');
        console.log('مثال على الناتج:');
        console.log('أسامة محمد موسى سلامه محمد أحمد إبراهيم صالح محمد الشاعر');
        console.log('═══════════════════════════════════════════════════════════════════');

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
exportFullLineageToExcel();

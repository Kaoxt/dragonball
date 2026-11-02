// Retain the original render/footer/artwork evidence across a later label-only repair.
export const beforeCategoryNative = row => row.category_label_revision?.before_native_sha256 ?? row.native_source_sha256;
export const beforeCategoryExport = (row, entry) => row.category_label_revision?.exports.find(e=>e.path===entry.path)?.before_sha256 ?? entry.after_sha256 ?? entry.sha256;
export const currentCategoryExport = (row, entry) => row.exports.find(e=>e.path===entry.path);

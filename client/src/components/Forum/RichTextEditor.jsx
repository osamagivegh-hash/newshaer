import React from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css'; // Add CSS for displaying fonts and sizes

// Configure sizes
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];
Quill.register(Size, true);

// Configure fonts
const Font = Quill.import('formats/font');
Font.whitelist = ['cairo', 'arial', 'tahoma', 'times-new-roman'];
Quill.register(Font, true);

export const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': Font.whitelist }],
        [{ 'size': Size.whitelist }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
    ],
};

const RichTextEditor = ({ value, onChange, placeholder, style, readOnly }) => {
    return (
        <div className="custom-quill-container">
            <ReactQuill
                theme="snow"
                modules={modules}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={style}
                readOnly={readOnly}
            />
        </div>
    );
};

export default RichTextEditor;

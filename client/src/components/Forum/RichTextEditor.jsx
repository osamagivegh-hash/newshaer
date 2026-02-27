import React, { useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import axios from 'axios';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';

const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];
Quill.register(Size, true);

const Font = Quill.import('formats/font');
Font.whitelist = ['cairo', 'arial', 'tahoma', 'times-new-roman'];
Quill.register(Font, true);

const RichTextEditor = ({ value, onChange, placeholder, style, readOnly }) => {
    const quillRef = useRef(null);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                // Show loading indicator or handle loading state if necessary
                const res = await axios.post('/api/upload/editor-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const url = res.data.url;
                if (url) {
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection() || { index: quill.getLength() };
                    quill.insertEmbed(range.index, 'image', url);
                    quill.setSelection(range.index + 1);
                }
            } catch (err) {
                console.error('Image upload failed', err);
                alert('فشل في رفع الصورة، تحقق من حجم الصورة واتصالك بالإنترنت.');
            }
        };
    };

    const videoHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('video', file);

            try {
                const res = await axios.post('/api/upload/video', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const url = res.data.url;
                if (url) {
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection() || { index: quill.getLength() };
                    quill.insertEmbed(range.index, 'video', url);
                    quill.setSelection(range.index + 1);
                }
            } catch (err) {
                console.error('Video upload failed', err);
                alert('فشل في رفع الفيديو، تأكد من حجم الفيديو (أقل من 30 ميجا عادة).');
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
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
            handlers: {
                image: imageHandler,
                video: videoHandler
            }
        }
    }), []);

    return (
        <div className="custom-quill-container">
            <ReactQuill
                ref={quillRef}
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

import React, { useState } from 'react';
import axios from 'axios';

const KernelExplorer = () => {
    const [image, setImage] = useState(null);
    const [kernelIndex, setKernelIndex] = useState(0);
    const [patchCoords, setPatchCoords] = useState({ x: 0, y: 0 });
    const [result, setResult] = useState(null);

    const handleSubmit = async(e) => {
        e.preventDefault();
        if (!image) return;

        const formData = new FormData();
        formData.append('image', image);
        formData.append('kernelIndex', kernelIndex);
        formData.append('x', patchCoords.x);
        formData.append('y', patchCoords.y);

        try {
            const res = await axios.post('http://localhost:5000/kernel-conv', formData);
            setResult(res.data);
        } catch (err) {
            console.error(err);
            alert("Error processing kernel.");
        }
    };

    return ( <
        div className = "p-4" >
        <
        h1 className = "text-2xl font-bold mb-4" > 🔍Kernel & Patch Explorer < /h1>

        <
        form onSubmit = { handleSubmit }
        className = "mb-4" >
        <
        input type = "file"
        onChange = {
            (e) => setImage(e.target.files[0]) }
        /> <
        div className = "my-2" >
        <
        label > Kernel Index: < /label> <
        input type = "number"
        value = { kernelIndex }
        onChange = {
            (e) => setKernelIndex(e.target.value) }
        /> <
        /div> <
        div className = "my-2" >
        <
        label > Patch X, Y: < /label> <
        input type = "number"
        value = { patchCoords.x }
        onChange = {
            (e) => setPatchCoords({...patchCoords, x: e.target.value }) }
        /> <
        input type = "number"
        value = { patchCoords.y }
        onChange = {
            (e) => setPatchCoords({...patchCoords, y: e.target.value }) }
        /> <
        /div> <
        button type = "submit"
        className = "bg-blue-600 text-white px-4 py-2 rounded" > Analyze < /button> <
        /form>

        {
            result && ( <
                div className = "bg-gray-100 p-4 rounded shadow" >
                <
                h2 className = "text-xl mb-2" > Results < /h2> <
                div > < strong > Selected Patch: < /strong> {JSON.stringify(result.patch)}</div >
                <
                div > < strong > Kernel Weights: < /strong> {JSON.stringify(result.kernel)}</div >
                <
                div > < strong > Output: < /strong> {result.output}</div >
                <
                /div>
            )
        } <
        /div>
    );
};

export default KernelExplorer;
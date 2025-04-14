import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => ( <
    nav className = "bg-blue-600 text-white px-4 py-2 flex gap-6" >
    <
    Link to = "/"
    className = "hover:underline" > CNN Visualizer < /Link> <
    Link to = "/kernel"
    className = "hover:underline" > Kernel Explorer < /Link> < /
    nav >
);

export default Navbar;
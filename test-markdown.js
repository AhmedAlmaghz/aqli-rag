import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';

const components = {
  code: ({node, inline, className, children, ...props}) => {
    if (className === 'language-math math-inline') return React.createElement('span', null, `\\(${children}\\)`);
    if (className === 'language-math math-display') return React.createElement('div', null, `\\[${children}\\]`);
    return React.createElement('code', props, children);
  }
}

console.log(renderToString(React.createElement(Markdown, { remarkPlugins: [remarkMath], components }, "Hello $x^2$ and $$\\int_0^1$$")));

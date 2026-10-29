import type { JSX, ReactNode } from 'react';
import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * @interface MarkdownPartProps
 * @description What a part of the text receives: its content, and its address for a link
 */
interface MarkdownPartProps {
    children?: ReactNode; /*!< Its content */
    href?: string; /*!< Where a link goes */
}

/**
 * @function Paragraph
 * @description A paragraph
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Paragraph(props: MarkdownPartProps): JSX.Element {
    return <p className='my-2 first:mt-0 last:mb-0'>{props.children}</p>;
}

/**
 * @function Heading
 * @description A heading, of any level: an answer is too short for levels to read apart
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Heading(props: MarkdownPartProps): JSX.Element {
    return <p className='mb-1 mt-3 font-semibold first:mt-0'>{props.children}</p>;
}

/**
 * @function BulletList
 * @description A list with bullets
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function BulletList(props: MarkdownPartProps): JSX.Element {
    return <ul className='my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0'>{props.children}</ul>;
}

/**
 * @function NumberedList
 * @description A numbered list
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function NumberedList(props: MarkdownPartProps): JSX.Element {
    return <ol className='my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0'>{props.children}</ol>;
}

/**
 * @function Link
 * @description A link, opened in a new tab
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Link(props: MarkdownPartProps): JSX.Element {
    return <a href={props.href} target='_blank' rel='noopener noreferrer' className='text-accent underline underline-offset-2'>{props.children}</a>;
}

/**
 * @function InlineCode
 * @description Code within a sentence; inside a block of code, the block gives the look
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function InlineCode(props: MarkdownPartProps): JSX.Element {
    return <code className='rounded bg-fill-strong px-1 py-0.5 font-mono text-[0.9em]'>{props.children}</code>;
}

/**
 * @function CodeBlock
 * @description A block of code, scrolling sideways when its lines are long
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function CodeBlock(props: MarkdownPartProps): JSX.Element {
    return <pre className='my-2 overflow-x-auto rounded-xl bg-fill-strong p-3 font-mono text-[13px] [&_code]:bg-transparent [&_code]:p-0'>{props.children}</pre>;
}

/**
 * @function Quote
 * @description A quotation
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Quote(props: MarkdownPartProps): JSX.Element {
    return <blockquote className='my-2 border-l-2 border-ink-quaternary pl-3 text-ink-secondary'>{props.children}</blockquote>;
}

/**
 * @function Table
 * @description A table, scrolling sideways when it is wide
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Table(props: MarkdownPartProps): JSX.Element {
    return (
        <div className='my-2 overflow-x-auto'>
            <table className='w-full border-collapse text-[14px]'>{props.children}</table>
        </div>
    );
}

/**
 * @function HeaderCell
 * @description A cell of a table's header
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function HeaderCell(props: MarkdownPartProps): JSX.Element {
    return <th className='border-b border-fill-strong px-2 py-1 text-left font-semibold'>{props.children}</th>;
}

/**
 * @function Cell
 * @description A cell of a table
 *
 * @param {MarkdownPartProps} props The properties of the part
 */
function Cell(props: MarkdownPartProps): JSX.Element {
    return <td className='border-b border-hairline px-2 py-1 tabular-nums'>{props.children}</td>;
}

/**
 * @function Rule
 * @description A line between two parts
 *
 * @returns {JSX.Element} The line
 */
function Rule(): JSX.Element {
    return <hr className='my-3 border-fill-strong' />;
}

/**
 * @constant MARKDOWN_PARTS
 * @description How each part of the text is drawn, in the page's own look
 */
const MARKDOWN_PARTS: Components = {
    p: Paragraph,
    h1: Heading,
    h2: Heading,
    h3: Heading,
    h4: Heading,
    h5: Heading,
    h6: Heading,
    ul: BulletList,
    ol: NumberedList,
    a: Link,
    code: InlineCode,
    pre: CodeBlock,
    blockquote: Quote,
    table: Table,
    th: HeaderCell,
    td: Cell,
    hr: Rule
};

/**
 * @interface MarkdownComponentProps
 * @description Properties of a text written in Markdown
 */
interface MarkdownComponentProps {
    text: string; /*!< The text */
}

/**
 * @function MarkdownComponent
 * @description A text written in Markdown, with GitHub's tables, lists of tasks and struck words. Raw HTML in the text
 * is shown as written, never run.
 *
 * @param {MarkdownComponentProps} props The properties of the component
 */
function MarkdownComponent(props: MarkdownComponentProps): JSX.Element {
    return <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_PARTS}>{props.text}</Markdown>;
}

export default MarkdownComponent;

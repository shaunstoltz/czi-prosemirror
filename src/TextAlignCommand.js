// @flow

import UICommand from './ui/UICommand';
import noop from './noop';
import nullthrows from 'nullthrows';
import toggleHeading from './toggleHeading';
import {EditorState, Selection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH} from './NodeNames';
import {Schema} from 'prosemirror-model';
import {TextSelection} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {findParentNodeOfType} from 'prosemirror-utils';
import {setBlockType} from 'prosemirror-commands';

export function setTextAlign(
  tr: Transform,
  schema: Schema,
  alignment: ?string,
): Transform {
  const {selection, doc} = tr;
  if (!selection || !doc) {
    return tr;
  }
  const {from, to, empty} = selection;
  const {nodes} = schema;

  const paragraph = nodes[PARAGRAPH];
  const heading = nodes[HEADING];
  const listItem = nodes[LIST_ITEM];
  const blockquote = nodes[BLOCKQUOTE];

  const tasks = [];
  alignment = alignment || null;

  const allowedNodeTypes = new Set([
    blockquote,
    heading,
    listItem,
    paragraph,
  ]);

  doc.nodesBetween(from, to, (node, pos, parentNode) => {
    const nodeType = node.type;
    if (!allowedNodeTypes.has(nodeType)) {
      return false;
    }

    const align = node.attrs.align || null;
    if (align !== alignment) {
      tasks.push({
        node,
        pos,
        nodeType,
      });
    }
    return (nodeType === listItem) ? true : false;

  });
  if (!tasks.length) {
    return tr;
  }

  tasks.forEach(job => {
    const {node, pos, nodeType} = job;
    let attrs;
    if (alignment) {
      attrs = {
        ...attrs,
        align: alignment,
      };
    } else {
      attrs = {
        ...attrs,
        align: null,
      };
    }
    tr = tr.setNodeMarkup(
      pos,
      nodeType,
      attrs,
      node.marks,
    );
  });

  return tr;
}

class TextAlignCommand extends UICommand {

  _alignment: string;

  constructor(alignment: string) {
    super();
    this._alignment = alignment;
  }

  isActive = (state: EditorState): boolean => {
    const {selection, doc, schema} = state;
    const {from, to} = selection;
    const {nodes} = schema;
    const paragraph = nodes[PARAGRAPH];
    const heading = nodes[HEADING];
    const blockquote = nodes[BLOCKQUOTE];
    let keepLooking = true;
    let active = false;
    doc.nodesBetween(from, to, (node, pos) => {
      const nodeType = node.type;
      if (
        keepLooking &&
        node.attrs.align === this._alignment
      ) {
        keepLooking = false;
        active = true;
      }
      return keepLooking;
    });
    return active;
  };

  isEnabled = (state: EditorState): boolean => {
    const {selection} = state;
    return (selection instanceof TextSelection);
  };

  execute = (
    state: EditorState,
    dispatch: ?(tr: Transform) => void,
    view: ?EditorView,
  ): boolean => {
    const {schema, selection} = state;
    const tr = setTextAlign(
      state.tr.setSelection(selection),
      schema,
      this._alignment,
    );
    if (tr.docChanged) {
      dispatch && dispatch(tr.scrollIntoView());
      return true;
    } else {
      return false;
    }
  };
}

export default TextAlignCommand;
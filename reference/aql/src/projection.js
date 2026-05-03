/**
 * AQL Projection Engine
 *
 * Applies the projection block of an Intent to a record, returning a new
 * object that contains only the fields the include set authorizes and that
 * the exclude set does not forbid. Per RFC 0020 section 3.3 this is the
 * contract between the Issuer and the Resolver about what data crosses the
 * boundary.
 *
 * @license Apache-2.0
 */

'use strict';

function project(record, projection) {
  const include = projection.include || ['/'];
  const exclude = projection.exclude || [];
  const result = {};
  for (const ptr of include) {
    const fragments = collect(record, ptr);
    for (const { path, value } of fragments) {
      if (path === '/') {
        // Expand root into per key fragments so exclude can apply per path.
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          for (const [k, v] of Object.entries(value)) {
            const childPath = `/${k}`;
            if (excluded(childPath, exclude)) continue;
            assign(result, childPath, v);
          }
        }
        continue;
      }
      if (excluded(path, exclude)) continue;
      assign(result, path, value);
    }
  }
  return result;
}

function collect(node, pointer) {
  if (pointer === '/' || pointer === '') return [{ path: '/', value: node }];
  const segments = pointer.replace(/^\//, '').split('/');
  const out = [];
  walk(node, segments, [], out);
  return out;
}

function walk(node, segments, path, out) {
  if (segments.length === 0) {
    out.push({ path: '/' + path.join('/'), value: deepClone(node) });
    return;
  }
  const [head, ...rest] = segments;
  if (node === null || node === undefined) return;
  if (head === '*') {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, rest, [...path, String(i)], out));
    else if (typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, rest, [...path, k], out);
    return;
  }
  if (head === '**') {
    if (rest.length === 0) {
      out.push({ path: '/' + path.join('/'), value: deepClone(node) });
      return;
    }
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, segments, [...path, String(i)], out));
    else if (typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, segments, [...path, k], out);
    walk(node, rest, path, out);
    return;
  }
  if (Array.isArray(node)) {
    const idx = Number(head);
    if (Number.isInteger(idx) && idx >= 0 && idx < node.length) walk(node[idx], rest, [...path, head], out);
  } else if (typeof node === 'object' && head in node) {
    walk(node[head], rest, [...path, head], out);
  }
}

function excluded(path, exclude) {
  for (const pat of exclude) {
    if (matchesPointer(path, pat)) return true;
  }
  return false;
}

function matchesPointer(path, pattern) {
  const ps = path.replace(/^\//, '').split('/');
  const qs = pattern.replace(/^\//, '').split('/');
  return matchSeg(ps, qs);
}

function matchSeg(ps, qs) {
  if (qs.length === 0) return ps.length === 0;
  const [q, ...qrest] = qs;
  if (q === '**') {
    if (qrest.length === 0) return true;
    for (let i = 0; i <= ps.length; i++) {
      if (matchSeg(ps.slice(i), qrest)) return true;
    }
    return false;
  }
  if (ps.length === 0) return false;
  const [p, ...prest] = ps;
  if (q === '*' || q === p) return matchSeg(prest, qrest);
  return false;
}

function assign(target, path, value) {
  if (path === '/') {
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(target, deepClone(value));
    return;
  }
  const segments = path.replace(/^\//, '').split('/');
  let cur = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!(seg in cur)) cur[seg] = isIndex(segments[i + 1]) ? [] : {};
    cur = cur[seg];
  }
  cur[segments[segments.length - 1]] = deepClone(value);
}

function isIndex(seg) { return /^\d+$/.test(seg); }

function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v));
}

module.exports = { project };

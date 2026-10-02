export function encode(value: unknown): unknown {
  if (typeof value === 'bigint') return { $ave: 'bigint', value: value.toString() };
  if (value instanceof Uint8Array) {
    let binary=''; for(let i=0;i<value.length;i+=16384) binary+=String.fromCharCode(...value.subarray(i,i+16384));
    return {$ave:'bytes',value:btoa(binary)};
  }
  if(Array.isArray(value)) return value.map(encode);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]));
  return value;
}
export function decode(value: any): any {
  if(value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join(',')==='$ave,value') {
    if(value.$ave==='bigint' && typeof value.value==='string' && /^-?\d+$/.test(value.value)) return BigInt(value.value);
    if(value.$ave==='bytes' && typeof value.value==='string') return Uint8Array.from(atob(value.value),c=>c.charCodeAt(0));
    throw new Error('Invalid AVE transport scalar');
  }
  if(Array.isArray(value)) return value.map(decode);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)]));
  return value;
}

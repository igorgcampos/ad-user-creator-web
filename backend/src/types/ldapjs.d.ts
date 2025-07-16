declare module 'ldapjs' {
  export interface SearchEntry {
    objectName: string;
    getAttribute(name: string): Attribute | undefined;
  }

  export interface Attribute {
    vals: string[];
  }

  export interface SearchResponse {
    on(event: 'searchEntry', listener: (entry: SearchEntry) => void): this;
    on(event: 'searchReference', listener: (referral: any) => void): this;
    on(event: 'page', listener: (result: any) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: (result: any) => void): this;
  }

  export interface Client {
    bind(dn: string, password: string, callback: (err: Error | null) => void): void;
    search(base: string, options: any, callback: (err: Error | null, res?: SearchResponse) => void): void;
    add(dn: string, entry: any, callback: (err: Error | null) => void): void;
    modify(dn: string, changes: any, callback: (err: Error | null) => void): void;
    del(dn: string, callback: (err: Error | null) => void): void;
    unbind(callback: (err: Error | null) => void): void;
  }

  export function createClient(options: any): Client;
} 
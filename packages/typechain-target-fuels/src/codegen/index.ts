/* eslint-disable @typescript-eslint/no-use-before-define */
import type { CodegenConfig } from 'typechain';

import { FACTORY_POSTFIX } from '../common';
import type { Contract } from '../parser/abiParser';

import {
  codegenFunctions,
  generateDecodeFunctionDataOverload,
  generateEncodeFunctionDataOverload,
  generateInterfaceFunctionDescription,
} from './functions';
import { reservedKeywords } from './reserved-keywords';

export function codegenContractTypings(contract: Contract, codegenConfig: CodegenConfig): string {
  const template = `
  import { Interface, FunctionFragment, DecodedValue } from "@fuel-ts/abi-coder"
  import { Contract } from "@fuel-ts/contract"
  import { BigNumberish } from '@ethersproject/bignumber';
  import { BytesLike } from '@ethersproject/bytes';

  interface ${contract.name}Interface extends Interface {
    functions: {
      ${Object.values(contract.functions)
        .map((v) => v[0])
        .map(generateInterfaceFunctionDescription)
        .join('\n')}
    };

    ${Object.values(contract.functions)
      .map((v) => v[0])
      .map(generateEncodeFunctionDataOverload)
      .join('\n')}

    ${Object.values(contract.functions)
      .map((v) => v[0])
      .map(generateDecodeFunctionDataOverload)
      .join('\n')}
  }

  export class ${contract.name} extends Contract {
    connect(signerOrProvider: Signer | Provider | string): this;
    interface: ${contract.name}Interface;
    functions: {
      ${Object.values(contract.functions)
        .map(codegenFunctions.bind(null, { returnResultObject: true, codegenConfig }))
        .join('\n')}
    };

    ${Object.values(contract.functions)
      .filter((f) => !reservedKeywords.has(f[0].name))
      .map(codegenFunctions.bind(null, { codegenConfig }))
      .join('\n')}
  }`;

  return template;
}
export function codegenAbstractContractFactory(contract: Contract, abi: any): string {
  const { body, header } = codegenCommonContractFactory(contract, abi);
  return `
  ${header}

  export class ${contract.name}${FACTORY_POSTFIX} {
    ${body}
  }
  `;
}

function codegenCommonContractFactory(
  contract: Contract,
  abi: any
): { header: string; body: string } {
  const header = `
  import { Interface } from "@fuel-ts/abi-coder";
  import { Contract } from "@fuel-ts/contract";
  import type { ${contract.name}, ${contract.name}Interface } from "../${contract.name}";
  const _abi = ${JSON.stringify(abi, null, 2)};
  `.trim();

  const body = `
    static readonly abi = _abi;
    static createInterface(): ${contract.name}Interface {
      return new Interface(_abi) as ${contract.name}Interface;
    }
    static connect(address: string, signerOrProvider: Provider): ${contract.name} {
      return new Contract(address, _abi, signerOrProvider) as ${contract.name};
    }
  `.trim();

  return { header, body };
}

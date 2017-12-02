import {InlineDocInfo} from '../model/model';
import {ResolvedUrl} from '../model/url';
import {Parser} from '../parser/parser';
import {UrlResolver} from '../url-loader/url-resolver';

import {ParsedJsonDocument} from './json-document';

export class JsonParser implements Parser<ParsedJsonDocument> {
  parse(
      contents: string, url: ResolvedUrl, _urlResolver: UrlResolver,
      inlineDocInfo: InlineDocInfo<any>): ParsedJsonDocument {
    const isInline = !!inlineDocInfo;
    inlineDocInfo = inlineDocInfo || {};
    return new ParsedJsonDocument({
      url,
      contents,
      ast: JSON.parse(contents),
      locationOffset: inlineDocInfo.locationOffset,
      astNode: inlineDocInfo.astNode,
      isInline
    });
  }
}

/**
 * HTTP-клиент для sudrf.ru.
 *
 * Эндпоинты:
 *   - ya_coords — все суды с координатами (один запрос)
 *   - ya_info   — детальная информация по коду суда
 *   - ajax_search — список судов региона (для верификации)
 *
 * Все эндпоинты работают без JS-защиты (в отличие от go_search).
 * Кодировка ответов: windows-1251.
 */

import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { JSDOM } from 'jsdom';
import * as iconv from 'iconv-lite';

import type { YaCoordData, YaInfoHtml } from '../types/sudrf.js';
import type { CourtRecord } from './CourtRecord.js';
import { extractRegionCode, extractCourtType, getCourtTypeName } from './CourtRecord.js';

const BASE_URL = 'https://sudrf.ru';
const DEFAULT_DELAY_MS = 1500; // 1.5s между запросами

export class SudrfClient {
  private http: AxiosInstance;
  private limiter: Bottleneck;

  constructor(delayMs: number = DEFAULT_DELAY_MS) {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: `${BASE_URL}/index.php?id=300`,
      },
      responseType: 'arraybuffer', // важно для cp1251
    });

    this.limiter = new Bottleneck({
      minTime: delayMs,
      maxConcurrent: 1,
    });
  }

  /** Декодирует ArrayBuffer из cp1251 в строку */
  private decode(buf: ArrayBuffer): string {
    return iconv.decode(Buffer.from(buf), 'win1251');
  }

  /**
   * Получает список ВСЕХ судов через ya_coords.
   * Возвращает Map<vnkod, YaCoordEntry[]>
   */
  async fetchAllCourts(): Promise<YaCoordData> {
    const resp = await this.http.get('/index.php', {
      params: { id: 300, act: 'ya_coords', type_suds: 'fs' },
      responseType: 'arraybuffer',
    });

    const js = this.decode(resp.data);
    return this.parseYaCoords(js);
  }

  /**
   * Парсит JS-скрипт ya_coords в структуру данных.
   * Формат: balloons_user['CODE']= new Array();
   *          balloons_user['CODE'][N]={type:'fs',name:'...',adress:'...',coord:[lat,lng]};
   */
  private parseYaCoords(js: string): YaCoordData {
    const result: YaCoordData = {};
    // Регулярка для извлечения записей balloons_user
    const re =
      /balloons_user\['([^']+)'\]\[balloons_user\['\1'\]\.length\]=\{type:'([^']+)',name:'((?:\\.|[^'])*)',adress:'((?:\\.|[^'])*)',coord:\[([\d.-]+),([\d.-]+)\]\};/g;

    let match: RegExpExecArray | null;
    while ((match = re.exec(js)) !== null) {
      const [, code, type, name, adress, lat, lng] = match;
      if (!result[code]) result[code] = [];
      result[code].push({
        type: type as 'fs' | 'ms',
        name: this.unescapeJsString(name),
        adress: this.unescapeJsString(adress),
        coord: [parseFloat(lat), parseFloat(lng)],
      });
    }

    return result;
  }

  /** Разэкранирует JS-строку (\', \", \\, \n, \t) */
  private unescapeJsString(s: string): string {
    return s
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  /**
   * Получает детальную информацию о суде по коду через ya_info.
   */
  async fetchCourtInfo(vnkod: string): Promise<YaInfoHtml | null> {
    try {
      const resp = await this.limiter.schedule(() =>
        this.http.get('/index.php', {
          params: { id: 300, act: 'ya_info', vnkod },
        }),
      );

      const html = this.decode(resp.data);
      return this.parseYaInfo(html);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] fetchCourtInfo(${vnkod}): ${msg}`);
      return null;
    }
  }

  /**
   * Парсит HTML ya_info в структуру.
   *
   * Пример:
   *   <div class="sud_name">Верещагинский районный суд Пермского края</div>
   *   <div class="sud_okrug_name"></div>
   *   <div class="sud_ter_name">Пермский край</div>
   *   <B>Классификационный код:</B> 59RS0014 <BR>
   *   <B>Адрес:</B> 617120, Пермский край, г. Верещагино, ул. Фрунзе, д. 74; ...<BR>
   *   <B>Телефон:</B> (34254) 3-36-62, (34277) 2-15-27 (ПСП с.Сива) <BR>
   *   <B>E-mail:</B><br>&nbsp;&nbsp;&nbsp;<a href='mailto:...'>...</a><br/>
   *   <B>Официальный сайт:</B><br/>&nbsp;&nbsp;&nbsp;<a href='...' TARGET='_blank'>...</A><br/>
   */
  private parseYaInfo(html: string): YaInfoHtml | null {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const sudName = doc.querySelector('.sud_name');
    const okrugName = doc.querySelector('.sud_okrug_name');
    const terName = doc.querySelector('.sud_ter_name');

    if (!sudName) return null;

    const body = doc.body.innerHTML;

    const code = this.extractField(body, 'Классификационный код');
    const address = this.extractField(body, 'Адрес');
    const phone = this.extractField(body, 'Телефон');

    // Email из ссылки mailto:
    const emailLink = doc.querySelector('a[href^="mailto:"]');
    const email = emailLink
      ? emailLink.getAttribute('href')!.replace('mailto:', '')
      : '';

    // Сайт из ссылки
    const siteLink = doc.querySelector(
      'a[href^="http://"], a[href^="https://"]',
    );
    const website = siteLink ? siteLink.getAttribute('href')! : '';

    return {
      courtName: sudName.textContent?.trim() ?? '',
      okrugName: okrugName?.textContent?.trim() ?? '',
      terName: terName?.textContent?.trim() ?? '',
      code,
      address,
      phone,
      email,
      website,
    };
  }

  /**
   * Извлекает значение поля из HTML по метке.
   * Ищет <B>Метка:</B> значение <BR>
   */
  private extractField(html: string, label: string): string {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `<B>${escaped}:<\\/B>\\s*(.*?)<BR>`,
      'i',
    );
    const m = re.exec(html);
    if (!m) return '';
    return m[1]
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Преобразует YaInfoHtml + код суда в CourtRecord.
   */
  toCourtRecord(vnkod: string, info: YaInfoHtml): CourtRecord {
    // Разделяем адреса по ";"
    const addresses: CourtRecord['addresses'] = [];
    const addressParts = info.address
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    addressParts.forEach((addr, i) => {
      const isPsp =
        /ПСП/i.test(addr) ||
        (addressParts.length > 1 && i > 0);
      addresses.push({
        type: i === 0 && !isPsp ? 'main' : 'psp',
        address: addr,
        phone: i === 0 ? info.phone : undefined,
      });
    });

    // Код типа суда из vnkod (RS из 59RS0014)
    const typeCode = extractCourtType(vnkod);
    const typeName = getCourtTypeName(typeCode);

    return {
      code: vnkod,
      name: info.courtName,
      court_type: typeCode,
      court_type_name: typeName,
      address: addressParts[0] ?? '',
      legal_address: null,
      website: info.website || null,
      inn: null,
      region_code: extractRegionCode(vnkod),
      addresses: addresses.length > 0 ? addresses : undefined,
      phone: info.phone || undefined,
      email: info.email || undefined,
      okato: null,
      okmo: null,
      okpo: null,
    };
  }

  /** Возвращает список кодов судов из YaCoordData */
  getCourtCodes(data: YaCoordData): string[] {
    return Object.keys(data).sort();
  }

  /**
   * Скачивает HTML со списком мировых судей (MS) через go_ms_search.
   */
  async fetchMsHtml(): Promise<string> {
    const resp = await this.http.get('/index.php', {
      params: {
        id: 300,
        act: 'go_ms_search',
        searchtype: 'ms',
        var: 'true',
        ms_type: 'ms',
        court_subj: 0,
      },
      responseType: 'arraybuffer',
    });
    return this.decode(resp.data);
  }

  /**
   * Парсит HTML go_ms_search в массив CourtRecord.
   *
   * Структура:
   *   <TR><TD>
   *     <a onclick='listcontrol(N,"CODE");'>НАЗВАНИЕ</a>
   *     <div class='courtInfoCont' id='mir_N'>
   *       <div class='sud_ter_name'>РЕГИОН</div>
   *       <b>Классификационный код:</b> CODE
   *       <b>Официальный сайт:</b><br>
   *       &nbsp;&nbsp;&nbsp;<a href='SITE'>SITE</a>
   *     </div>
   *   </TD></TR>
   */
  parseMsHtml(html: string): CourtRecord[] {
    const records: CourtRecord[] = [];

    // Разбиваем по TR
    const trRe = /<TR><TD>.*?<\/TD><\/TR>/gs;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRe.exec(html)) !== null) {
      const block = trMatch[0];

      // Извлекаем код и название из onclick
      const onclickRe = /onclick='[^']*"([^"]+)"[^']*'>([^<]+)<\/a>/;
      const onclickMatch = block.match(onclickRe);
      if (!onclickMatch) continue;
      const code = onclickMatch[1];
      const name = onclickMatch[2].trim();

      // Извлекаем сайт
      const siteRe = /<a[^>]*href='([^']+)'[^>]*>/;
      const siteMatch = block.match(siteRe);
      const website = siteMatch ? siteMatch[1] : '';

      const typeCode = extractCourtType(code);
      const typeName = getCourtTypeName(typeCode);

      records.push({
        code,
        name,
        court_type: typeCode,
        court_type_name: typeName,
        address: '',
        legal_address: null,
        website: website || null,
        inn: null,
        region_code: extractRegionCode(code),
        phone: undefined,
        email: undefined,
        okato: null,
        okmo: null,
        okpo: null,
      });
    }

    return records;
  }
}

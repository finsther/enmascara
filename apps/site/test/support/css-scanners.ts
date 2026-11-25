const HEX_COLOR =
  /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const COLOR_FUNCTION =
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[^()]*\)/gi;
const COLOR_DECLARATION =
  /(?:^|[;{\s"'])(?:color|background(?:-color)?|border(?:-[a-z]+)*|fill|stroke|outline(?:-color)?|accent-color|caret-color|text-decoration-color|column-rule-color|box-shadow|text-shadow)\s*:\s*([^;}"'\n]*)/gi;
const CUSTOM_PROPERTY_DECLARATION = /(--[\w-]+)\s*:\s*([^;}]+)/g;
const CUSTOM_PROPERTY_USE = /var\(\s*(--[\w-]+)/g;
const WORD = /[a-z]+/gi;
const CUSTOM_PROPERTY_REFERENCE = /var\(\s*--[\w-]+/g;

const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
  blue blueviolet brown burlywood cadetblue chartreuse chocolate coral
  cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
  darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
  darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod
  gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
  lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue
  lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru
  pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown
  salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray
  slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet
  wheat white whitesmoke yellow yellowgreen`.split(/\s+/),
);

function namedColorsIn(text: string): readonly string[] {
  return [...text.matchAll(COLOR_DECLARATION)].flatMap(([, value = '']) =>
    [...value.replace(CUSTOM_PROPERTY_REFERENCE, '').matchAll(WORD)]
      .map(([word]) => word.toLowerCase())
      .filter((word) => NAMED_COLORS.has(word)),
  );
}

export function colorLiteralsIn(text: string): readonly string[] {
  return [
    ...[...text.matchAll(HEX_COLOR)].map(([color]) => color),
    ...[...text.matchAll(COLOR_FUNCTION)].map(([color]) => color),
    ...namedColorsIn(text),
  ];
}

export function customPropertiesDeclaredIn(
  css: string,
): ReadonlyMap<string, string> {
  return new Map(
    [...css.matchAll(CUSTOM_PROPERTY_DECLARATION)].map(
      ([, name = '', value = '']) => [name, value.trim()],
    ),
  );
}

export function customPropertiesUsedIn(text: string): ReadonlySet<string> {
  return new Set(
    [...text.matchAll(CUSTOM_PROPERTY_USE)].map(([, name = '']) => name),
  );
}

export function declarationsInRule(
  css: string,
  selector: string,
): ReadonlyMap<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) {
    return new Map();
  }
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return customPropertiesDeclaredIn(body);
}

"""Build native vector theme variants without changing source art or product imagery."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/illustrations'
OUTPUT = ART / 'themed'

PALETTES = {
    'light': {
        'blue': [(0, '#e0f5ff'), (.075, '#69bdff'), (.24, '#1265cf'), (.49, '#073a8c'), (.61, '#2188e4'), (.78, '#094aab'), (1, '#03265e')],
        'glass': [(0, '#f4fbff'), (.07, '#b9e7ff'), (.21, '#57b7fa'), (.44, '#267ed8'), (.67, '#0751a8'), (.82, '#338edb'), (1, '#042e73')],
        'edge': [(0, '#8dd8ff'), (.2, '#247cd2'), (.47, '#052c70'), (.72, '#145bac'), (1, '#021d4b')],
        'sphere': [(0, '#f1fcff'), (.08, '#9de3ff'), (.24, '#2186e6'), (.53, '#0750b2'), (.78, '#063685'), (1, '#021d52')],
    },
    'dark': {
        'blue': [(0, '#f3fcff'), (.09, '#8ee8ff'), (.26, '#16b1ff'), (.49, '#0767d5'), (.63, '#38c9ff'), (.80, '#0a74dc'), (1, '#063f94')],
        'glass': [(0, '#ffffff'), (.08, '#d8f8ff'), (.27, '#8edcff'), (.48, '#3db6f5'), (.69, '#137dca'), (.83, '#5fcfff'), (1, '#0856a7')],
        'edge': [(0, '#abefff'), (.2, '#299dec'), (.47, '#063a83'), (.72, '#177cce'), (1, '#03265e')],
        'sphere': [(0, '#ffffff'), (.09, '#c8f7ff'), (.27, '#3dccff'), (.53, '#078df5'), (.78, '#095abc'), (1, '#033176')],
    },
}

# Preserve the existing geometry/gradient coordinates. Add a narrow bright reflection
# before the coloured body instead of washing the whole surface in pale cyan.
SURFACE_KEYS = {'blue': 'blue', 'glass': 'glass', 'card': 'glass', 'edge': 'edge',
                'dark': 'edge', 'sphere': 'sphere', 'blue-edge': 'edge',
                'rim': 'blue', 'needle': 'blue', 'face': 'glass',
                'page': 'glass', 'cover': 'edge'}

def stops(values):
    return ''.join(f'<stop offset="{offset:g}" stop-color="{color}"/>' for offset, color in values)

def gradient(match, mode):
    opening, kind, name, contents, closing = match.groups()
    key = SURFACE_KEYS.get(name)
    if key:
        return opening + stops(PALETTES[mode][key]) + closing
    return match.group(0)

def themed(source, mode, icon):
    source = re.sub(r'(<(linearGradient|radialGradient)\b[^>]*\bid="([^"]+)"[^>]*>)(.*?)(</(?:linearGradient|radialGradient)>)',
                    lambda match: gradient(match, mode), source, flags=re.S)
    # Small information marks remain distinct against the richer glass panels.
    for ink in ('#1878b8', '#286c9e', '#175ba0'):
        source = source.replace(f'stroke="{ink}"', 'stroke="#d4f1ff"')
    source = source.replace('stdDeviation="7"', 'stdDeviation="4"')
    source = source.replace('stdDeviation="9"', 'stdDeviation="5"')
    source = source.replace('flood-opacity=".23"', 'flood-opacity=".30"' if mode == 'light' else 'flood-opacity=".20"')
    if icon and 'id="depth"' in source:
        # Narrow offset reflections give the line icons a glass-tube finish.
        # Use geometry rather than runtime lighting filters so small repeated icons stay cheap.
        depth = '<filter id="depth" x="-20%" y="-20%" width="150%" height="155%"><feDropShadow dx="0" dy="1.7" stdDeviation=".8" flood-color="#032557" flood-opacity=".28"/></filter>'
        source = re.sub(r'<filter id="depth"[^>]*>.*?</filter>', lambda _: depth, source, flags=re.S)
        shapes = re.findall(r'<g stroke="url\(\#(?:blue|orange)\)">(.*?)</g>', source, flags=re.S)
        if shapes:
            glints = '<g transform="translate(-.45 -.6)" fill="none" stroke="#dcf6ff" stroke-opacity=".7" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round">' + ''.join(shapes) + '</g>'
            source = source.replace('</svg>', glints + '\n</svg>')
    source = source.replace('fill="#0867ae"', 'fill="#e3f7ff"')
    return source

pages = [ROOT / 'index.html', *sorted(ROOT.glob('*/index.html'))]
refs = set(json.loads((OUTPUT / 'manifest.json').read_text())) if (OUTPUT / 'manifest.json').exists() else set()
for page in pages:
    if page.parent.name in {'dist', 'node_modules'}:
        continue
    refs.update(re.findall(r'(?:src|data-theme-light-src|data-theme-dark-src)="(/assets/illustrations/(?!themed/)[^"?]+\.svg)', page.read_text()))

# Older compact compositions used a very wide transparent canvas. The themed
# versions fit their subject while retaining a comfortable rim for highlights/shadows.
TRIMMED_VIEWBOXES = {
    'client-support.svg': '84 0 250 180',
    'account-options.svg': '88 -12 254 200',
    'risk-guide.svg': '88 8 248 172',
    'verification.svg': '95 -5 305 325',
    'documents.svg': '55 20 380 300',
    'partnership.svg': '60 35 360 265',
    'global-markets.svg': '75 30 330 280',
    'icons/automation.svg': '17 19 66 66',
    'icons/book.svg': '15 21 67 55',
    'icons/calendar.svg': '18 20 62 61',
    'icons/chart.svg': '22 23 57 56',
    'icons/chat.svg': '11 23 70 60',
    'icons/check.svg': '17 19 63 63',
    'icons/compass.svg': '18 19 63 63',
    'icons/devices.svg': '15 23 70 58',
    'icons/document.svg': '24 20 54 61',
    'icons/globe.svg': '19 20 61 61',
    'icons/journey-route.svg': '4 2 72 60',
    'icons/mail.svg': '16 26 67 51',
    'icons/people.svg': '18 22 66 55',
    'icons/phone.svg': '18 20 64 65',
    'icons/search.svg': '18 19 63 63',
    'icons/shield.svg': '23 20 53 63',
    'icons/sliders.svg': '16 24 67 53',
    'icons/step-balance.svg': '5 2 58 60',
    'icons/step-deposit.svg': '2 -1 61 62',
    'icons/step-identity.svg': '2 7 61 58',
    'icons/step-live-account.svg': '1 3 62 59',
    'icons/step-metatrader.svg': '0 6 63 55',
    'icons/step-register.svg': '2 10 62 50',
    'icons/step-trade-review.svg': '3 2 62 62',
    'icons/transfer.svg': '21 21 59 59',
    'icons/wallet.svg': '22 21 58 53',
}

manifest = {}
for url in sorted(refs):
    relative = Path(url.removeprefix('/assets/illustrations/'))
    original = ART / relative
    if relative.name == 'account-support-light.svg':
        original = ART / 'account-support-dark.svg'
    source = original.read_text()
    entry = {}
    for mode in ('light', 'dark'):
        path = OUTPUT / mode / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        variant = themed(source, mode, 'icons' in relative.parts)
        if relative.as_posix() in TRIMMED_VIEWBOXES:
            bounds = TRIMMED_VIEWBOXES[relative.as_posix()]
            _, _, width, height = bounds.split()
            variant = re.sub(r'viewBox="[^"]+"', f'viewBox="{bounds}"', variant, count=1)
            variant = re.sub(r'width="[^"]+"', f'width="{width}"', variant, count=1)
            variant = re.sub(r'height="[^"]+"', f'height="{height}"', variant, count=1)
        path.write_text(variant)
        entry[mode] = '/' + path.relative_to(ROOT).as_posix()
    manifest[url] = entry

(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
Path('/private/tmp/nextwise-art-map.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Created {len(manifest)} pairs of vector illustrations')

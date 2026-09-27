"""Rebuild TeXDraft's geometric sigma icon using only Python's standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).parent
POLYGON = [(0.28, .25), (.73, .25), (.73, .32), (.40, .32), (.58, .49), (.40, .69), (.73, .69), (.73, .76), (.27, .76), (.27, .68), (.47, .49), (.28, .32)]


def inside(x, y):
    result = False
    for a, b in zip(POLYGON, POLYGON[1:] + POLYGON[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            result = not result
    return result


def png(size):
    pixels = bytearray()
    for row in range(size):
        pixels.append(0)
        for col in range(size):
            channels = [0, 0, 0, 0]
            for sy in (.25, .75):
                for sx in (.25, .75):
                    x, y = (col + sx) / size, (row + sy) / size
                    rounded = max(abs(x - .5) - .30, 0) ** 2 + max(abs(y - .5) - .30, 0) ** 2 < .17 ** 2
                    color = (245, 241, 229, 255) if inside(x, y) else (58, 83, 69, 255 if rounded else 0)
                    channels = [a + b for a, b in zip(channels, color)]
            pixels.extend(channel // 4 for channel in channels)
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


images = {size: png(size) for size in (32, 128, 256, 512)}
(ROOT / 'icon.png').write_bytes(images[256])
for size in (32, 128):
    (ROOT / f'{size}x{size}.png').write_bytes(images[size])
ico = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', 0, 0, 0, 0, 1, 32, len(images[256]), 22) + images[256]
(ROOT / 'icon.ico').write_bytes(ico)
chunks = b''.join(tag + struct.pack('>I', len(images[size]) + 8) + images[size] for tag, size in ((b'ic07', 128), (b'ic08', 256), (b'ic09', 512)))
(ROOT / 'icon.icns').write_bytes(b'icns' + struct.pack('>I', len(chunks) + 8) + chunks)

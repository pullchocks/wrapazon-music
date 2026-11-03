# Maintainer: pullchocks <160859472+pullchocks@users.noreply.github.com>
pkgname=wrapazon-music
pkgver=1.0.0
pkgrel=1
pkgdesc='Amazon Music in its own window'
arch=('any')
url='https://github.com/pullchocks/wrapazon-music'
license=('MIT')
depends=('bash' 'chromium')
optdepends=(
  'libnotify: show an error when Chromium is missing'
  'libsecret: save the Amazon password in the keyring'
)
source=("$pkgname-$pkgver.tar.gz::https://github.com/pullchocks/wrapazon-music/archive/refs/tags/v$pkgver.tar.gz")
sha256sums=('SKIP')

package() {
  cd "$pkgname-$pkgver"
  install -Dm755 wrapazon "$pkgdir/usr/share/wrapazon-music/wrapazon"
  install -Dm644 wrapazon-music.desktop "$pkgdir/usr/share/applications/wrapazon-music.desktop"
  install -Dm644 assets/wrapazon.svg "$pkgdir/usr/share/icons/hicolor/scalable/apps/wrapazon-music.svg"
  install -d "$pkgdir/usr/share/wrapazon-music/extension"
  install -m644 extension/* "$pkgdir/usr/share/wrapazon-music/extension/"
  install -d "$pkgdir/usr/bin"
  ln -s ../share/wrapazon-music/wrapazon "$pkgdir/usr/bin/wrapazon"
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}

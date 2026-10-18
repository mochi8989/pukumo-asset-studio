# Google Fonts利用とライセンス確認

確認日：2026-10-19。使用する6書体はすべてSIL Open Font License 1.1（OFL）です。Google Fonts公式リポジトリの各OFL.txtを取得して確認しました。商用のデザイン・画像制作に利用できます。

| 書体 | 利用ウェイト | ライセンス原文 |
| --- | --- | --- |
| Noto Sans JP | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/notosansjp/OFL.txt) |
| Noto Serif JP | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/notoserifjp/OFL.txt) |
| Zen Maru Gothic | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/zenmarugothic/OFL.txt) |
| Montserrat | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/montserrat/OFL.txt) |
| Lora | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/lora/OFL.txt) |
| Dancing Script | 400 / 700 | [OFL.txt](https://github.com/google/fonts/blob/main/ofl/dancingscript/OFL.txt) |

フォントソフトウェアを再配布する場合は著作権表示・ライセンスの維持などOFLの条件に従う必要があります。予約名のあるフォントを改変する場合には名称の条件も適用されます。本アプリはフォントを改変・同梱せず、Google Fonts CSS API経由で読み込みます。出力PNG・販売ZIP・管理ZIPにはフォントファイルを含めません。OFLはフォントを使って作成した画像自体にOFLの適用を要求しません。

参照： [Google Fonts FAQ](https://developers.google.com/fonts/faq)、[CSS API v2](https://developers.google.com/fonts/docs/css2)。

APIキーは不要です。フォントの取得にはネットワーク接続が必要です。通信失敗時には端末の汎用フォントを使用した旨を表示し、プレビューとPNG出力で同じ書体を使用します。

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IAudioInfoTrack } from '../ffmpeg/types';
import { IExtractedSubtitles } from '../subtitles/extractedSubtitlesType';
import { spawn } from 'child_process';

export interface IVideoInfo {
  duration: number;
  resolution: { width: number; height: number };
  audioTracks: IAudioInfoTrack[];
  subtitlesInfo: IExtractedSubtitles[];
}

@Injectable()
export class MediainfoService {
  async getVideoInfo(videoPath: string) {
    return new Promise<IVideoInfo>((resolve, reject) => {
      try {
        // const mediainfo = spawn('mediainfo', ['--Output=JSON', videoPath]);
        const pathToMediainfo = 'C:\\Program Files\\MediaInfo_CLI_24.05_Windows_x64\\mediainfo.exe';
        const mediainfo = spawn(pathToMediainfo, ['--Output=JSON', videoPath]);

        let stdout = '';
        let stderr = '';

        mediainfo.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        mediainfo.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        mediainfo.on('close', (code) => {
          if (code === 0) {
            const mediainfoJson = JSON.parse(stdout);
            const videoInfoArray = mediainfoJson.media.track.filter(
              (track: any) => track['@type'] === 'Video',
            );
            const audioInfoArray =
              mediainfoJson.media.track.filter((track: any) => track['@type'] === 'Audio') || [];
            const subtitlesInfoArray =
              mediainfoJson.media.track.filter((track: any) => track['@type'] === 'Text') || [];
            const videoInfo = videoInfoArray[0];

            const audioTracks = audioInfoArray.map((audio, index) => ({
              index: index,
              bitrate: audio.BitRate,
              title: audio.Title,
              language: audio.Language,
              default: audio.Default,
              format: audio.Format,
              channels: audio.Channels,
              channelPositions: audio.ChannelPositions,
              codec: audio.CodecID,
            }));

            const subtitlesInfo = subtitlesInfoArray.map((subtitle, index) => ({
              index: index,
              codec:
                subtitle.Format === 'SubRip'
                  ? 'subrip'
                  : subtitle.CodecID === 'tx3g'
                    ? 'mov_text'
                    : 'ass',
              language: subtitle.Language || 'und',
              title: subtitle.Title || undefined,
            }));

            const fullInfo = {
              duration: Math.round(parseFloat(videoInfo.Duration)),
              resolution: { width: parseInt(videoInfo.Width), height: parseInt(videoInfo.Height) },
              audioTracks: audioTracks,
              subtitlesInfo: subtitlesInfo,
            };
            resolve(fullInfo);
          } else {
            reject(new Error(`mediainfo exited with code ${code}: ${stderr}`));
          }
        });
      } catch (e) {
        console.log(e);
        throw new HttpException('ошибка mediaInfo', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  }
}
// episodservis video info {
//   "creatingLibrary":{"name":"MediaInfoLib","version":"24.05","url":"https://mediaarea.net/MediaInfo"},
//   "media":{"@ref":"C:\\my_web\\kinoteatr-server\\tmp\\uploads\\faafd390-da2a-4b08-89f9-374a1889b220.mp4","track":[{"@type":"General","VideoCount":"1",
//     "AudioCount":"3",
//     "TextCount":"3",
//     "MenuCount":"2",
//     "FileExtension":"mp4",
//     "Format":"MPEG-4",
//     "Format_Profile":"Base Media",
//     "CodecID":"isom",
//     "CodecID_Compatible":"isom/iso2/avc1/mp41",
//     "FileSize":"334330646",
//     "Duration":"1321.504",
//     "OverallBitRate_Mode":"VBR",
//     "OverallBitRate":"2023940",
//     "FrameRate":"23.976",
//     "FrameCount":"31682",
//     "StreamSize":"2056295",
//     "HeaderSize":"40",
//     "DataSize":"332275700",
//     "FooterSize":"2054906",
//     "IsStreamable":"No",
//     "Title":"Рик и Морти / Rick and Morty (2013) S01E01 Пилот / Pilot",
//     "Movie":"Рик и Морти / Rick and Morty (2013) S01E01 Пилот / Pilot",
//     "File_Created_Date":"2024-06-28 14:23:24.925 UTC",
//     "File_Created_Date_Local":"2024-06-28 17:23:24.925",
//     "File_Modified_Date":"2024-06-28 14:23:29.151 UTC",
//     "File_Modified_Date_Local":"2024-06-28 17:23:29.151",
//     "Encoded_Application":"Lavf61.3.100"},{"@type":"Video","StreamOrder":"0",
//     "ID":"1",
//     "Format":"AVC",
//     "Format_Profile":"Main",
//     "Format_Level":"3.1",
//     "Format_Settings_CABAC":"Yes",
//     "Format_Settings_RefFrames":"4",
//     "CodecID":"avc1",
//     "Duration":"1321.404",
//     "BitRate_Mode":"VBR",
//     "BitRate":"1423453",
//     "BitRate_Maximum":"4499968",
//     "Width":"1280",
//     "Height":"720",
//     "Sampled_Width":"1280",
//     "Sampled_Height":"720",
//     "PixelAspectRatio":"1.000",
//     "DisplayAspectRatio":"1.778",
//     "Rotation":"0.000",
//     "FrameRate_Mode":"CFR",
//     "FrameRate":"23.976",
//     "FrameRate_Num":"24000",
//     "FrameRate_Den":"1001",
//     "FrameCount":"31682",
//     "ColorSpace":"YUV",
//     "ChromaSubsampling":"4:2:0",
//     "BitDepth":"8",
//     "ScanType":"Progressive",
//     "StreamSize":"235119668",
//     "Title":"MPEG-4 AVC @ ~2500 kbps - NTb",
//     "Language":"en",
//     "BufferSize":"3000000",
//     "extra":{"Menus":"8","CodecConfigurationBox":"avcC"}},{"@type":"Audio","@typeorder":"1","StreamOrder":"1",
//     "ID":"2",
//     "Format":"AAC",
//     "Format_Settings_SBR":"No (Explicit)",
//     "Format_AdditionalFeatures":"LC",
//     "CodecID":"mp4a-40-2",
//     "Duration":"1321.504",
//     "Source_Duration":"1321.525",
//     "Source_Duration_LastFrame":"-0.011",
//     "BitRate_Mode":"CBR",
//     "BitRate":"196094",
//     "Channels":"2",
//     "ChannelPositions":"Front: L R",
//     "ChannelLayout":"L R",
//     "SamplesPerFrame":"1024",
//     "SamplingRate":"48000",
//     "SamplingCount":"63432192",
//     "FrameRate":"46.875",
//     "FrameCount":"61945",
//     "Source_FrameCount":"61947",
//     "Compression_Mode":"Lossy",
//     "StreamSize":"32392696",
//     "Source_StreamSize":"32393017",
//     "Title":"AC3 5.1 @ 640 Kbps -  Одноголосый закадровый, Сыендук",
//     "Language":"ru",
//     "Default":"Yes",
//     "AlternateGroup":"1",
//     "extra":{"Menus":"8","Source_Delay":"-21","Source_Delay_Source":"Container"}},{"@type":"Audio","@typeorder":"2","StreamOrder":"2",
//     "ID":"3",
//     "Format":"AAC",
//     "Format_Settings_SBR":"No (Explicit)",
//     "Format_AdditionalFeatures":"LC",
//     "CodecID":"mp4a-40-2",
//     "Duration":"1321.504",
//     "Source_Duration":"1321.525",
//     "Source_Duration_LastFrame":"-0.011",
//     "BitRate_Mode":"CBR",
//     "BitRate":"197184",
//     "Channels":"2",
//     "ChannelPositions":"Front: L R",
//     "ChannelLayout":"L R",
//     "SamplesPerFrame":"1024",
//     "SamplingRate":"48000",
//     "SamplingCount":"63432192",
//     "FrameRate":"46.875",
//     "FrameCount":"61945",
//     "Source_FrameCount":"61947",
//     "Compression_Mode":"Lossy",
//     "StreamSize":"32572744",
//     "Source_StreamSize":"32573079",
//     "Title":"AC3 5.1 @ 640 Kbps",
//     "Language":"en",
//     "Default":"No",
//     "AlternateGroup":"1",
//     "extra":{"Menus":"8","Source_Delay":"-21","Source_Delay_Source":"Container"}},{"@type":"Audio","@typeorder":"3","StreamOrder":"3",
//     "ID":"4",
//     "Format":"AAC",
//     "Format_Settings_SBR":"No (Explicit)",
//     "Format_AdditionalFeatures":"LC",
//     "CodecID":"mp4a-40-2",
//     "Duration":"1321.472",
//     "Source_Duration":"1321.493",
//     "BitRate_Mode":"CBR",
//     "BitRate":"192000",
//     "Channels":"2",
//     "ChannelPositions":"Front: L R",
//     "ChannelLayout":"L R",
//     "SamplesPerFrame":"1024",
//     "SamplingRate":"48000",
//     "SamplingCount":"63430656",
//     "FrameRate":"46.875",
//     "FrameCount":"61944",
//     "Source_FrameCount":"61945",
//     "Compression_Mode":"Lossy",
//     "StreamSize":"32112299",
//     "Source_StreamSize":"32112869",
//     "Title":"AC3 2.0 @ 192 Kbps - Commentary with Dan Harmon, Justin Roiland and Ryan Elder",
//     "Language":"en",
//     "Default":"No",
//     "AlternateGroup":"1",
//     "extra":{"Menus":"8","Source_Delay":"-21","Source_Delay_Source":"Container"}},{"@type":"Text","@typeorder":"1","StreamOrder":"4",
//     "ID":"5",
//     "Format":"Timed Text",
//     "MuxingMode":"sbtl",
//     "CodecID":"tx3g",
//     "Duration":"1295.928",
//     "BitRate_Mode":"VBR",
//     "BitRate":"174",
//     "FrameRate":"0.530",
//     "FrameCount":"687",
//     "StreamSize":"28213",
//     "Title":"SRT - Full - Netflix",
//     "Language":"ru",
//     "Default":"Yes",
//     "Forced":"No",
//     "AlternateGroup":"3",
//     "Events_Total":"343",
//     "extra":{"Menus":"8"}},{"@type":"Text","@typeorder":"2","StreamOrder":"5",
//     "ID":"6",
//     "Format":"Timed Text",
//     "MuxingMode":"sbtl",
//     "CodecID":"tx3g",
//     "Duration":"1317.484",
//     "BitRate_Mode":"VBR",
//     "BitRate":"145",
//     "FrameRate":"1.036",
//     "FrameCount":"1365",
//     "StreamSize":"23905",
//     "Title":"SRT - Full",
//     "Language":"en",
//     "Default":"No",
//     "Forced":"No",
//     "AlternateGroup":"3",
//     "Events_Total":"682",
//     "extra":{"Menus":"8"}},{"@type":"Text","@typeorder":"3","StreamOrder":"6",
//     "ID":"7",
//     "Format":"Timed Text",
//     "MuxingMode":"sbtl",
//     "CodecID":"tx3g",
//     "Duration":"1317.484",
//     "BitRate_Mode":"VBR",
//     "BitRate":"151",
//     "FrameRate":"1.092",
//     "FrameCount":"1439",
//     "StreamSize":"24826",
//     "Title":"SRT - Full SDH",
//     "Language":"en",
//     "Default":"No",
//     "Forced":"No",
//     "AlternateGroup":"3",
//     "Events_Total":"719",
//     "extra":{"Menus":"8"}},{"@type":"Menu","@typeorder":"1","StreamOrder":"7",
//     "ID":"8",
//     "Format":"Timed Text",
//     "CodecID":"text",
//     "Duration":"1321.504",
//     "Language":"en",
//     "extra":{"BitRate_Mode":"CBR","Menu_For":"1,2,3,4,5,6,7","_00_00_00_000":"Chapter 1","_00_02_07_961":"Chapter 2","_00_02_39_826":"Chapter 3","_00_08_35_348":"Chapter 4","_00_21_35_461":"Chapter 5","BitRate_Mode_String":"Constant
//       "}},{"@type":"Menu","@typeorder":"2","extra":{"_00_00_00_000":"Chapter 1","_00_02_07_961":"Chapter 2","_00_02_39_826":"Chapter 3","_00_08_35_348":"Chapter 4","_00_21_35_461":"Chapter 5"}}]}
//     }

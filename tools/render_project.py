#!/usr/bin/env python3
"""Optional native, accurate, scalable ShortForm Studio renderer.

Usage:
  python3 tools/render_project.py project.json --media-dir /folder/with/sources --out output.mp4
Requires ffmpeg + ffprobe. Runs locally; no server or cloud.
"""
from __future__ import annotations
import argparse, json, math, pathlib, re, shutil, subprocess, sys, tempfile


def bounded(v, low, high):
    return max(low, min(high, float(v)))


def run(args):
    print('Running:', ' '.join(map(str,args[:6])), '...', flush=True)
    subprocess.run([str(x) for x in args], check=True)


def probe(path):
    p=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(path)],capture_output=True,text=True,check=True)
    return {s.get('codec_type') for s in json.loads(p.stdout).get('streams',[])}


def find_media(asset,media_dir):
    requested=pathlib.Path(asset['name']).name
    path=media_dir/requested
    if not path.is_file():
        raise FileNotFoundError(f'Cannot locate {requested!r} in {media_dir}. Please provide all source files with original filenames.')
    if path.stat().st_size == 0:raise ValueError(f'Empty media file: {requested}')
    return path


def caption_srt(project):
    words=[];offset=0.0
    for seg in project.get('segments',[]):
        rate=bounded(seg.get('speed',1),.25,3)
        for word in project.get('words',[]):
            if word['assetId']!=seg['assetId']:continue
            s=max(float(word['start']),float(seg['start']));e=min(float(word['end']),float(seg['end']))
            if e<=s:continue
            words.append((offset+(s-float(seg['start']))/rate,offset+(e-float(seg['start']))/rate,word['text']))
        offset+=(float(seg['end'])-float(seg['start']))/rate
    words.sort()
    def t(s):
        n=max(0,round(s*1000));h,n=divmod(n,3600000);m,n=divmod(n,60000);sec,ms=divmod(n,1000)
        return f'{h:02}:{m:02}:{sec:02},{ms:03}'
    return '\n\n'.join(f'{i//6+1}\n{t(chunk[0][0])} --> {t(chunk[-1][1])}\n'+ ' '.join(x[2] for x in chunk) for i in range(0,len(words),6) if (chunk:=words[i:i+6]))+'\n'


def render(project,media_dir,out,keep_temp=False):
    for binary in ('ffmpeg','ffprobe'):
        if not shutil.which(binary):raise RuntimeError(f'{binary} not found; install FFmpeg first')
    settings=project.get('settings',{});rat=settings.get('aspect','9:16').split(':');w=round(int(settings.get('outputHeight',1080))*int(rat[0])/int(rat[1]));h=int(settings.get('outputHeight',1080))
    w+=w%2;h+=h%2;fps=round(bounded(settings.get('fps',30),15,60));bitrate=int(bounded(settings.get('quality',6000000),500000,30000000));segments=project.get('segments',[])
    if not segments:raise ValueError('The project has no video cuts')
    media={a['id']:find_media(a,media_dir) for a in project.get('assets',[])}
    with tempfile.TemporaryDirectory(prefix='shortform-') as root:
        tmp=pathlib.Path(root);parts=[]
        for i,s in enumerate(segments):
            src=media[s['assetId']];start=float(s['start']);end=float(s['end']);speed=bounded(s.get('speed',1),.25,3);length=(end-start)/speed
            if length<=.02:continue
            outpart=tmp/f'{i:05}.mp4';kind=probe(src);zoom=bounded(s.get('zoom',1),.5,3)*bounded(settings.get('zoom',1),.5,3)
            fx=bounded(s.get('focusX',.5),0,1);fy=bounded(s.get('focusY',.5),0,1)
            # All segments are encoded to identical frame, audio, and codec formats.
            vf=f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},'
            if zoom>1: vf+=f'crop=iw/{zoom}:ih/{zoom}:(iw-ow)*{fx}:(ih-oh)*{fy},scale={w}:{h},'
            vf+=f'setpts=(PTS-STARTPTS)/{speed},fps={fps},format=yuv420p,eq=brightness={(bounded(settings.get("brightness",100),0,200)-100)/100:.3f}:contrast={bounded(settings.get("contrast",100),0,200)/100:.3f}:saturation={bounded(settings.get("saturation",100),0,200)/100:.3f}'
            args=['ffmpeg','-y','-hide_banner','-loglevel','error']
            still=src.suffix.lower() in ('.png','.jpg','.jpeg','.webp')
            if still:args+=['-loop','1','-framerate',str(fps),'-i',str(src)]
            else:args+=['-ss',str(start),'-t',str(end-start),'-i',str(src)]
            audio='audio'in kind
            video_input=0
            if 'video' not in kind and not still:
                args+=['-f','lavfi','-i',f'color=c=black:s={w}x{h}:r={fps}:d={length}'];video_input=1
            silent_input=None
            if not audio:
                silent_input=2 if video_input==1 else 1
                args+=['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']
            args+=['-map',f'{video_input}:v:0','-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','20','-b:v',str(bitrate),'-pix_fmt','yuv420p']
            if audio:
                args+=['-map','0:a:0','-af',f'atempo={speed},volume={bounded(s.get("volume",1),0,2)}','-c:a','aac','-b:a','192k']
            else:args+=['-map',f'{silent_input}:a:0','-c:a','aac','-b:a','192k']
            args+=['-t',str(length),'-movflags','+faststart',str(outpart)]
            run(args);parts.append(outpart);print(f'Cut {i+1}/{len(segments)} complete',flush=True)
        if not parts:raise ValueError('No valid video cuts')
        concat=tmp/'concat.txt';concat.write_text(''.join(f"file '{p.name}'\n" for p in parts),encoding='utf-8')
        joined=tmp/'joined.mp4';run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(joined)])
        overlays=project.get('audio',[]);input_args=['-i',str(joined)];filter_parts=[];mix=['[0:a]'];duration_total=sum((float(s['end'])-float(s['start']))/bounded(s.get('speed',1),.25,3) for s in segments)
        for i,a in enumerate(overlays,1):
            src=media.get(a.get('assetId'));start=float(a.get('start',0));length=min(float(a.get('duration',0)),duration_total-start)
            if not src or length<=0:continue
            input_args+=['-ss',str(float(a.get('sourceStart',0))),'-t',str(length),'-i',str(src)]
            label=f'[voice{i}]';filter_parts.append(f'[{len(mix)}:a]volume={bounded(a.get("volume",1),0,2)},adelay={round(start*1000)}|{round(start*1000)}{label}');mix.append(label)
        filters=[]
        if filter_parts:
            filters+=filter_parts;filters.append(''.join(mix)+f'amix=inputs={len(mix)}:duration=first:dropout_transition=0[aout]')
        captions=tmp/'captions.srt';captions.write_text(caption_srt(project),encoding='utf-8')
        cmd=['ffmpeg','-y','-hide_banner','-loglevel','error',*input_args]
        if settings.get('captionOn',True) and captions.stat().st_size>1:
            # FFmpeg's subtitles filter needs libass; copy under a simple filename in workdir.
            subvf="subtitles=captions.srt:force_style='Fontsize=18,Alignment=2,MarginV=80'"
            cmd+=['-vf',subvf]
        if filters:cmd+=['-filter_complex',';'.join(filters),'-map','0:v:0','-map','[aout]']
        else:cmd+=['-map','0:v:0','-map','0:a:0']
        cmd+=['-c:v','libx264','-preset','medium','-crf','20','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out.absolute())]
        # Relative caption filter path resolved from cwd for FFmpeg.
        print('Final mixing, subtitles and encode...',flush=True)
        subprocess.run(cmd,cwd=str(tmp),check=True)
        print(f'Exported {out} ({out.stat().st_size/1048576:.1f} MiB)',flush=True)


def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('project',type=pathlib.Path);a.add_argument('--media-dir',type=pathlib.Path,required=True);a.add_argument('--out',type=pathlib.Path,default=pathlib.Path('shortform-render.mp4'));a.add_argument('--all-candidates',action='store_true',help='Render each AI candidate into its own MP4');args=a.parse_args()
    try:
        data=json.loads(args.project.read_text(encoding='utf-8'))
        if args.all_candidates:
            candidates=data.get('candidates',[])
            if not candidates:raise ValueError('This project has no AI clip candidates')
            args.out.parent.mkdir(parents=True,exist_ok=True)
            for i,c in enumerate(candidates,1):
                suffix=re.sub(r'[^A-Za-z0-9_-]+','-',c.get('title','clip')).strip('-')[:45] or 'clip'
                output=args.out.parent/f'{args.out.stem}-{i:02}-{suffix}.mp4'
                render({**data,'segments':c['segments']},args.media_dir,output)
        else:render(data,args.media_dir,args.out)
    except (ValueError,KeyError,RuntimeError,FileNotFoundError,subprocess.CalledProcessError) as ex:print('Render failed:',ex,file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()

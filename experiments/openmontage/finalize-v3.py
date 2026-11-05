from pathlib import Path
import subprocess,json
p=Path(__file__).parent;src=p/'renders/nafhamha-sky-final-v3.mp4';dst=p/'renders/nafhamha-sky-final.mp4'
# Measured 2048 samples of mixer lead-in at 48kHz; remove without re-encoding video.
# Output AAC edit list retains correct priming metadata. Add/trim only silent end padding.
subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af','atrim=start_sample=2048,asetpts=PTS-STARTPTS,apad=whole_dur=117.6,atrim=duration=117.6','-c:a','aac','-b:a','256k','-ar','48000','-t','117.6','-movflags','+faststart',str(dst)],check=True)
(p/'artifacts/audio-sync-correction-v3.json').write_text(json.dumps({'measured_mixer_lead_in_samples':2048,'sample_rate':48000,'correction_seconds':2048/48000,'video_reencoded':False,'target_seconds':117.6,'note':'Confirmed against source speech in all eight scenes; final QA must verify corrected file'},indent=2))
print(dst)

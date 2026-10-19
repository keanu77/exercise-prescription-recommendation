"""Optional font build; requires fonttools==4.61.1. See assets/fonts/README.md."""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
from pathlib import Path
import sys
source = Path(sys.argv[1])
font = instantiateVariableFont(TTFont(source), {'wght': 400}, inplace=True)
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=subset.parse_unicodes('0000-024F,2000-22FF,3000-30FF,3400-4DBF,4E00-9FFF,F900-FAFF,FF00-FFEF'))
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in [1, 3, 4, 6, 16, 17, 25]:
        value = {1:'Exercise Report Sans', 3:'Exercise Report Sans Regular 1.0', 4:'Exercise Report Sans Regular', 6:'ExerciseReportSans-Regular', 16:'Exercise Report Sans', 17:'Regular', 25:'ExerciseReportSans'}[record.nameID]
        record.string = value.encode(record.getEncoding())
font.save('assets/fonts/ExerciseReportSans-Regular.ttf')
print('font bytes:', Path('assets/fonts/ExerciseReportSans-Regular.ttf').stat().st_size)

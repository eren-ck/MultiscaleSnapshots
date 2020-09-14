# -*- coding: utf-8 -*-
"""
Config - configure logging information
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

import sys
import logging

formatting = '%(asctime)s - %(levelname)s - %(name)s: %(message)s'
logging.basicConfig(format=formatting, stream=sys.stdout, level=logging.INFO)

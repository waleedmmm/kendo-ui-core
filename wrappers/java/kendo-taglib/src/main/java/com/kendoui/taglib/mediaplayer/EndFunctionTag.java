
package com.kendoui.taglib.mediaplayer;

import com.kendoui.taglib.FunctionTag;

import com.kendoui.taglib.MediaPlayerTag;


import javax.servlet.jsp.JspException;

@SuppressWarnings("serial")
public class EndFunctionTag extends FunctionTag /* interfaces */ /* interfaces */ {
    
    @Override
    public int doEndTag() throws JspException {
//>> doEndTag


        MediaPlayerTag parent = (MediaPlayerTag)findParentWithClass(MediaPlayerTag.class);


        parent.setEnd(this);

//<< doEndTag

        return super.doEndTag();
    }

    @Override
    public void initialize() {
//>> initialize
//<< initialize

        super.initialize();
    }

    @Override
    public void destroy() {
//>> destroy
//<< destroy

        super.destroy();
    }

//>> Attributes
//<< Attributes

}
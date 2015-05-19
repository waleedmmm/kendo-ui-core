using System.IO;
using Microsoft.AspNet.Mvc;
using Kendo.Mvc.Extensions;
using Microsoft.AspNet.Mvc.ModelBinding;

namespace Kendo.Mvc.UI
{
    /// <summary>
    /// Kendo UI PivotGrid component
    /// </summary>
    public partial class PivotGrid<T> : WidgetBase
        where T : class 
    {
        public PivotGrid(ViewContext viewContext) : base(viewContext)
        {
            DataSource = new PivotDataSource(ModelMetadataProvider);
            DataSource.ModelType(typeof(T));
        }

        [Activate]
        public IModelMetadataProvider ModelMetadataProvider
        {
            get;
            set;
        }

        [Activate]
        public IUrlGenerator UrlGenerator
        {
            get;
            set;
        }

        public PivotGridMessages Messages
        {
            get;            
        } = new PivotGridMessages();

        public string Configurator
        {
            get;
            set;
        }

        public PivotDataSource DataSource
        {
            get;
            private set;
        }

        public string KPIStatusTemplate { get; set; }

        public string KPIStatusTemplateId { get; set; }

        public string KPITrendTemplate { get; set; }

        public string KPITrendTemplateId { get; set; }

        protected override void WriteHtml(TextWriter writer)
        {
            var tag = Generator.GenerateTag("div", ViewContext, Id, Name, HtmlAttributes);

            writer.Write(tag.ToString());

            base.WriteHtml(writer);
        }

        public override void WriteInitializationScript(TextWriter writer)
        {
            var settings = SerializeSettings();

            if (!string.IsNullOrEmpty(Configurator))
            {
                settings["configurator"] = Configurator;
            }

            if (KPIStatusTemplateId.HasValue())
            {
                settings["kpiStatusTemplate"] = new ClientHandlerDescriptor
                {
                    HandlerName = string.Format(
                        "jQuery('{0}{1}').html()", IdPrefix, KPIStatusTemplateId
                    )
                };
            }
            else if (KPIStatusTemplate.HasValue())
            {
                settings["kpiStatusTemplate"] = KPIStatusTemplate;
            }

            if (KPITrendTemplateId.HasValue())
            {
                settings["kpiTrendTemplate"] = new ClientHandlerDescriptor
                {
                    HandlerName = string.Format(
                        "jQuery('{0}{1}').html()", IdPrefix, KPITrendTemplateId
                    )
                };
            }
            else if (KPITrendTemplate.HasValue())
            {
                settings["kpiTrendTemplate"] = KPITrendTemplate;
            }

            var messages = Messages.ToJson();
            if (messages.Count > 0)
            {
                settings["messages"] = messages;
            }

            settings["dataSource"] = DataSource.ToJson();

            writer.Write(Initializer.Initialize(Selector, "PivotGrid", settings));
        }
    }
}

